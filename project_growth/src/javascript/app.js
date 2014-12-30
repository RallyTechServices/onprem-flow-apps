Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    EXPORT_FILE_NAME: 'project-growth-export.csv',
    MAX_WORKSPACES: 500, 
    launch: function() {
        this._getWorkspaces('projects').then({
            scope: this,
            success: function(histories){
                this.setLoading('Calculating...');
                this.logger.log("Found histories:", histories);
                
                // 1.) Get an array of all the days between the first rev-hist and today (x-axis - categories)).
                var first_date = this._getEarliestRevisionDate(histories);
                this.logger.log("First revision-history date = ",first_date);
                var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(new Date(first_date),new Date(),false);
                this.logger.log("Total days covered", array_of_days);
                
                var series = []; 
                Ext.each(histories, function(history){
                    if (history.record && history.revisions && history.revisions.length > 0){
                        var ws_name = history.record.get('Name');  //WS Name here';
                        
                        // 2.) Cycle thru the revisions and make a running count (y-axis - series)
                        var count_hash = {};
                        var counter = 1; // Allow for Rally's 'Sample' project which never shows up in rev hist.
                        Ext.Array.each(array_of_days,function(day){
                            Ext.Array.each(history.revisions,function(revision){
                                var revdate = revision.get('CreationDate');
                                if (revdate > day && revdate < Rally.util.DateTime.add(day,'day',+1)) {
                                    counter++;
                                }
                            });
                            count_hash[day] = counter;
                        });
                        
                        var series_data = [];
                        Ext.Object.each(count_hash,function(day,value){
                            series_data.push(value);
                        });
                        series.push({type:'area',name:ws_name,stack:1,data:series_data});
                    }
                },this);
                
                // 3.) Make chart
                this.setLoading(false);
                this._makeChart(array_of_days,series);
            },
            failure: function(error_message){
                alert(error_message);
            }
        });
    },
    _getEarliestRevisionDate: function(histories){
        
        this.logger.log('_getEarliestRevisionDate');
        var first_date = new Date(); 
        Ext.each(histories, function(history){
            if (history.revisions && history.revisions.length > 0){
                var revdate = history.revisions[0].get('CreationDate');
                if (revdate < first_date) {
                    first_date = revdate;
                }
            }
        },this);
        this.logger.log("_getEarliestRevisionDate: First revision-history date = ",first_date);
        return first_date;
        
    },
    _makeChart: function(categories,serieses){
        this.logger.log('_makeChart');
        var formatted_categories = [];
        Ext.Array.each(categories,function(category){
            formatted_categories.push(Ext.util.Format.date(category,'Y-m-d'));
        });
        
        this.down('#display_box').add({
            xtype:'rallychart',
            chartData: {
                series: serieses
            },
            chartConfig: {
                chart: {},
                title: {
                    text: 'Cumulative Project Creation',
                    align: 'center'
                },
                yAxis: [{ title: { text: 'Count' } }],
                xAxis: [{
                    tickmarkPlacement: 'on',
                    tickInterval: 56,
                    categories:  formatted_categories,
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
        
        this.down('#display_box').add({
            xtype: 'rallybutton',
            text: 'Export',
            margin: 10,  
            listeners: {
                scope: this, 
                click: function(){
                    this._exportData(serieses);
                }
            }
        });
    },  
    _exportData: function(serieses){
        this.logger.log('_exportData');
        var current_date = new Date(); 
        var text = Ext.String.format("Workspace, Current Projects ({0})\n",Rally.util.DateTime.format(current_date,'MM/dd/yyyy'));
        Ext.each(serieses, function(series){
            var current_num_projects = 0;
            var name = '';
            if (series && series.name){
                name = series.name; 
                if (series.data && series.data.length > 0){
                    current_num_projects=series.data[series.data.length-1];
                }
            }
            text += Ext.String.format("{0},{1}\n",name, current_num_projects);
        },this);
        var file_name = Rally.util.DateTime.format(current_date,'yyyy-MM-dd_hh-mm-ss-') + this.EXPORT_FILE_NAME;
        this.logger.log('_exportData', text, file_name);
        Rally.technicalservices.FileUtilities.saveTextAsFile(text,file_name);
    },
    _getWorkspaces: function(state_field){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Subscription',
            fetch: ['Workspaces'],
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store, records, success){
                    if (success){
                        this.logger.log("Total workspace count", records[0].get('Workspaces').Count);
                        records[0].getCollection('Workspaces',{
                                fetch: ['ObjectID','Name','RevisionHistory','State'],
                                limit: this.MAX_WORKSPACES,
                                buffered: false
                        }).load({
                            callback: function(records, operation, success){
                                var promises = []; 
                                me.logger.log('getCollection callback.  Total workspaces:',records.length);
                                Ext.Array.each(records,function(record){
                                    if (record.get('State') == 'Open'){
                                        var p = function(){
                                            return me._getHistoryForRecord(record,state_field);
                                        }
                                        promises.push(p);
                                    }
                                },this);
                                me.logger.log('Open workspaces',promises.length);
                                Deft.Chain.parallel(promises).then({
                                    success: function(histories) {
                                        deferred.resolve(histories);
                                    },
                                    failure: deferred.reject
                                });
                            }
                       });
                       
                    } else {
                        deferred.reject('Error getting list of workspaces');
                    }
                }
            }
        });
        return deferred;  
    },
    
    _getHistoryForRecord: function(record,state_field) {
        var deferred = Ext.create('Deft.Deferred');
        this.setLoading('Get Revision data...');
        this.logger.log('getting history for ', record.get('Name'),record.get('ObjectID'),record.get('_ref'),record.get('RevisionHistory').ObjectID);
        
        // contains searches are case insensitive, so 
        // TODO: deal with possibility that the name of the field is in the description change
        //       without changing the field itself (like in the name or something)
        var state_selection_filters = Ext.create('Rally.data.wsapi.Filter',{
            property:'Description', 
            operator:'contains',
            value: Ext.util.Format.uppercase(state_field)
        }).or(Ext.create('Rally.data.wsapi.Filter',{
            property:'Description', 
            operator:'contains',
            value: 'Added project '}));
        
        var rev_history_filter = Ext.create('Rally.data.wsapi.Filter',{
            property:"RevisionHistory.ObjectID",
            value: record.get('RevisionHistory').ObjectID
        });
        
        var filters = rev_history_filter.and(state_selection_filters);
        // use a regular wsapi store instead of loading the collection because I'm having
        // trouble with getting the collection to recognize the filters.
        Ext.create('Rally.data.wsapi.Store',{
            autoLoad: true,
            model:'Revision',
            context: {workspace: record.get('_ref'),
                project: null},
            filters: filters,
            limit: 'Infinity',
            fetch: ['Description','CreationDate'],
            sorters: [{property:'CreationDate',direction:'ASC'}],
            listeners: {
                scope: this,
                load: function(store,revisions,success){
                    var matching_revs = [];
                    Ext.Array.each(revisions,function(rev){
                        var description = rev.get('Description');
                        var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('projects', description);
                        if (parsed_result.new_value != null) {
                            matching_revs.push(rev);
                        }
                    });
                    if (success && matching_revs.length > 1){  //TODO:  why is this greater than 1 and not greater than 0?
                        deferred.resolve({record: record, revisions: matching_revs});
                    } else {
                        deferred.resolve({});
                    }
                }
            }
        });
        return deferred.promise;        
    }
});