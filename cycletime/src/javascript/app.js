Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    skipWeekends: true,
    records: [],
    grid: null,
    margin: 10,
    defaults: { margin: 5 },
    items: [
        {xtype:'container',itemId:'selector_box', defaults: { margin: 5 }},
        {xtype:'container',itemId:'display_box', layout: { type: 'hbox' }, items:[
            {xtype:'container',itemId:'grid_box', defaults: { margin: 5 }, flex: 1},
            {xtype:'container',itemId:'chart_box', minHeight: 600, defaults: { margin: 5 }, flex: 1}
        ] },
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._addButtons(this.down('#selector_box'));
    },
    _addButtons: function(container){
        container.add({
            xtype:'rallybutton',
            text: 'Settings',
            listeners: {
                scope: this,
                click: function(button){
                    Ext.create('Rally.technicalservices.SettingsDialog',{
                        autoShow: true,
                        width: 550,
                        listeners: {
                            scope: this,
                            settingsChosen: function(dialog,settings) {
                                this.logger.log("Found settings: ", settings);
                                this._processWithSettings(settings);
                            }
                        }
                    });
                }
            }
        });
        
        container.add({
            xtype:'rallybutton',
            itemId:'save_button',
            text:'Save As CSV',
            disabled: true,
            scope: this,
            handler: function() {
                var csv = this._getCSVFromDataAndGrid();
                this._saveCSVToFile(csv,'cycle_time.csv',{type:'text/csv;charset=utf-8'});
            }
        });
    },
    /*
     * expect settings to look like: 
     * {
     *      start_date: date,
     *      end_date: date,
     *      model: type path,  // TODO: change to full model
     *      state_field: field object
     * }
     */
    _processWithSettings: function(settings){
       this.settings = settings;
       this.setLoading("Gathering data...");
       this.down('#save_button').setDisabled(true);
       this._getStories(settings.model, settings.state_field, settings.start_date, settings.end_date).then({
           scope: this,
           success: this._makeGrid,
           failure: function(message){
               this.down('#grid_box').add({xtype:'container',html:'Problem: '+message});
           }
       });
    },
    _makeGrid: function(results){
        // expect to get back an array of hashes, where the key to each hash is a formatted id,
        // so we can just merge into a single hash
        var items = {};
        Ext.Array.each(results,function(result){
            Ext.Object.merge(items,result);
        });
        this.logger.log("Results:", items);
        this.records = this._calculateCycleTime(items);
                
        this.logger.log("Ready for store:", this.records);
        
        var store = Ext.create('Rally.data.custom.Store',{
            data: this.records
        });
        
        this.down('#grid_box').removeAll();
        this.grid = this.down('#grid_box').add({
            xtype:'rallygrid',
            store: store,
            pagingToolbarCfg: {
                store: store
            },
            showRowActionsColumn: false,
            columnCfgs: [
                {
                    text: 'id',
                    dataIndex:'FormattedID'
                },
                {
                    text: 'Name',
                    dataIndex:'Name',
                    flex: 1
                },
                {
                    text: this.settings.start_state.get('name'),
                    dataIndex:'__start_date',
                    flex: 1
                },
                {
                    text: this.settings.end_state.get('name'),
                    dataIndex:'__end_date',
                    flex: 1
                },
                {
                    text: 'Cycle Time (days)',
                    dataIndex:'__cycle_time'
                }
            ]
        });
        
        if ( this.records.length > 0 ) {
            this.down('#save_button').setDisabled(false);
        }
        
        this._makeCFDFromRecords(this.records);

        this.setLoading(false);
    },
    /* expecting a hash that looks like
     * {
     *     record: a data record,
     *     revisions: an array of revision records
     * }
     * 
     * want to return an array of records with calculated data
     */
    _calculateCycleTime:function(item_hashes){
        this.setLoading("Calculating cycle times...");
        this.logger.log("Calculating cycle time using:", Ext.clone(item_hashes));
        var records = [];
        
        var field_name = this.settings.state_field.get('name');
        var start_state = this.settings.start_state;
        var end_state = this.settings.end_state;
        
        Ext.Object.each(item_hashes, function(key,item_hash){
            var record = item_hash.record;
            var revisions = item_hash.revisions;
            record.set('_revisions',revisions);
            this.logger.log(record.get('FormattedID'));
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions(revisions, field_name, start_state.get('name'), end_state.get('name'));
            this.logger.log("Found pair of revisions:",found_revisions);
            
            if ( found_revisions.length == 2 ) {
                var start_date = found_revisions[0].get('CreationDate');
                var end_date = found_revisions[1].get('CreationDate');
                this.logger.log("do math on ", start_date, end_date);
                var cycle_time = Rally.technicalservices.util.Utilities.daysBetween(end_date,start_date,this.skipWeekends);
                                
                record.set("__start_date",start_date);
                record.set("__end_date", end_date);
                record.set('__cycle_time', cycle_time);
                
                records.push(record);
            }
        },this);
        
        return records;
    },
    _getStories: function(model, state_field, start_date, end_date){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Getting ", model, ".", state_field, " last updated between ", start_date, " and " , end_date);
        
        var state_field_name = state_field;
        var state_field_name_alternative = state_field;
        if ( typeof(state_field) != "string" ) {
            state_field_name = state_field.get('name');
            state_field_name_alternative = state_field.get('value');
            this.logger.log("Checking ", state_field_name, state_field_name_alternative);
        }
        // for a little bit of performance help, find things that changed
        // between the begin and end dates
        var filters = [
            { property:'LastUpdateDate', operator: '>=', value: Rally.util.DateTime.toIsoString(start_date)}
        ];
        Ext.create('Rally.data.wsapi.Store', {
            model: model,
            fetch: ['RevisionHistory',state_field_name,'Revisions','FormattedID','Name','ObjectID'],
            filters: filters,
            limit: 600,
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store, records, successful) {
                    if (successful){
                        //this.logger.log("Found records:", records.length, records);
                        var promises = [];
                        Ext.Array.each(records,function(record){
                            var p = function(){
                                return me._getHistoryForRecord(record,state_field,start_date, end_date);
                            }
                            promises.push(p);
                        },this);
                        
                        //this.logger.log("Executing ", promises.length, " promises");
                        Deft.Chain.parallel(promises).then({
                            success: function(histories) {
                                deferred.resolve(histories);
                            },
                            failure: deferred.reject
                        });
                        
                    } else {
                        deferred.reject('Failed to load store for model [' + model_name + '] and fields [' + model_fields.join(',') + ']');
                    }
                }
            }
        });
        return deferred.promise;
    },
    _getHistoryForRecord: function(record,state_field,start_date, end_date) {
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('getting history for ', record.get('FormattedID'));
        
        var date_filters = Ext.create('Rally.data.wsapi.Filter',{
            property:'CreationDate',
            operator:'>=',
            value: Rally.util.DateTime.toIsoString(start_date)
        }).and(Ext.create('Rally.data.wsapi.Filter',{
            property:'CreationDate',
            operator:'<=',
            value: Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(new Date(end_date),'day',1))
        }));
        
        var state_field_name = state_field;
        var state_field_name_alternative = state_field;
        if ( typeof(state_field) != "string" ) {
            state_field_name = state_field.get('name');
            state_field_name_alternative = state_field.get('value');
        }
        
        // contains searches are case insensitive, so 
        // TODO: deal with possibility that the name of the field is in the description change
        //       without changing the field itself (like in the name or something)
        var state_selection_filters = Ext.create('Rally.data.wsapi.Filter',{
            property:'Description', 
            operator:'contains',
            value: Ext.util.Format.uppercase(state_field_name)
        }).or(Ext.create('Rally.data.wsapi.Filter',{
            property:'Description', 
            operator:'contains',
            value: Ext.util.Format.uppercase(state_field_name_alternative)
        })).or(Ext.create('Rally.data.wsapi.Filter',{
            property:'Description',
            value:'Original revision'
        }));
        
        var rev_history_filter = Ext.create('Rally.data.wsapi.Filter',{
            property:"RevisionHistory.ObjectID",
            value: record.get('RevisionHistory').ObjectID
        });
        
        var filters = rev_history_filter.and( date_filters.and(state_selection_filters) );
        // use a regular wsapi store instead of laoding the collection because I'm having
        // trouble with getting the collection to recognize the filters.
        Ext.create('Rally.data.wsapi.Store',{
            autoLoad: true,
            model:'Revision',
            filters: filters,
            fetch: ['Description','CreationDate'],
            sorters: [{property:'CreationDate',direction:'ASC'}],
            listeners: {
                scope: this,
                load: function(store,revisions){
                    //this.logger.log('revs for ', record.get('FormattedID'), ':',revisions);
                    var rev_hash = {};
                    // Only hold on to this set if there are 2 revisions (because we want to have transition
                    // into the start AND the end states
                    if ( revisions.length > 1 ) {
                        rev_hash[record.get('FormattedID')] = {record: record, revisions: revisions};
                    }
                    deferred.resolve(rev_hash);
                }
            }
        });

        return deferred.promise;        
    },
    _getAllowedValuesFrom: function(field_definition){
        this.logger.log("_getAllowedValuesFrom",field_definition);
        
        var allowed_values = [];
        var allowed_values_set = this.settings.state_field.get('fieldDefinition')._allowedValueStore.data.items;
        
        this.logger.log("Allowed:", allowed_values_set);
        if ( allowed_values_set._ref ) {
            // this is a collection
            this.logger.log("This is a collection");
        } else {
            this.logger.log("This is an array of values")
            Ext.Array.each(allowed_values_set,function(allowed_value){
                allowed_values.push(allowed_value.get('StringValue') || "None");
            });
        }
        return allowed_values;
    },
    _makeCFDFromRecords: function(records){
        this.setLoading("Calculating CFD");
        this.down('#chart_box').removeAll();
        this.logger.log("Getting CFD information", records);
        Ext.Array.each(records,function(record){
            var changes = Rally.technicalservices.util.Parser.getStateAttainments(record.get('_revisions'), this.settings.state_field.get('name'));
            record.set('_changes',changes);
        },this);
        
        var start_date = this.settings.start_date;
        var end_date = this.settings.end_date;
        
        var cumulative_flow = Rally.technicalservices.util.Parser.getCumulativeFlow(records, start_date, end_date);
        
        this.logger.log("Got cumulative flow:",cumulative_flow, this.settings.state_field);
        
        var series_names = this._getAllowedValuesFrom(this.settings.state_field);
//        Ext.Array.each(allowed_values,function(allowed_value){
//            series_names.push(allowed_value.StringValue);
//        });
        this.logger.log("Allowed Values:", series_names);
        
        var categories = [];
        
        Ext.Object.each(cumulative_flow,function(key,value){
            categories.push(Ext.util.Format.date(key,'d/m'));
        });
        
        if ( records.length == 0 ) {
            this.down('#chart_box').add({xtype:'container',html:'No data found'});
        } else {
            this.logger.log(categories);
            
            var serieses = [];
            Ext.Array.each( series_names, function(series_name){
                var series = {type:'area',name:series_name,stack:1,data:[]};
                Ext.Array.each(Ext.Object.getKeys(cumulative_flow),function(category){
                    var value =  0;
                    if ( cumulative_flow[category][series_name] && cumulative_flow[category][series_name].length > 0 ) {
                        value = cumulative_flow[category][series_name].length;
                    }
                    series.data.push(value);
                });
                serieses.push(series);
            });
            
            this.logger.log(serieses);
            this.down('#chart_box').add({
                xtype:'rallychart',
                chartData: {
                    series: serieses
                },
                chartConfig: {
                    chart: {},
                    title: {
                        text: 'Cumulative Flow',
                        align: 'center'
                    },
                    yAxis: [{ title: { text: 'Count' } }],
                    xAxis: [{
                        tickmarkPlacement: 'on',
                        tickInterval: 7,
                        categories:  categories,
                        labels: {
                            align: 'left',
                            rotation: 70
                        }
                    }],
                    plotOptions: {
                        series: {
                            marker: { enabled: false },
                            stacking: 'normal'
                        }
                    }
                }
            });
        }
    },
    _getCSVFromDataAndGrid: function() {
        var csv = [];
        if ( this.records && this.grid ) {
            var columns = this.grid.getColumnCfgs();
            
            this.logger.log("columns", columns);
            var header = this._getHeaderFromColumns(columns);
            csv.push(header);
            
            Ext.Array.each(this.records,function(record){
                var line_array = [];
                Ext.Array.each(columns,function(column){
                    var data = record.get(column.dataIndex);
                    if ( typeof(data) == 'object' ) {
                        data = Ext.util.Format.date(data,'d/m/Y');
                    }
                    line_array.push('"' + data + '"');
                });
                csv.push(line_array.join(','));
            });
                
        }
        
        return csv.join('\r\n');
    },
    _getHeaderFromColumns: function(columns){
        var header = [];
        Ext.Array.each(columns,function(column){
            header.push(column.text);
        });
        return header.join(',');
    },
    _saveCSVToFile:function(csv,file_name,type_object){
        var blob = new Blob([csv],type_object);
        saveAs(blob,file_name);
    }
});