Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'select_box', layout: {type:'hbox'}},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    EXPORT_FILE_NAME: 'project-growth-export.csv',
    MAX_WORKSPACES: 500, 
    launch: function() {

        this.fetchWorkspaces().then({
            scope: this,
            success: function(workspaces){
                this.logger.log('fetchWorkspaces Success', workspaces.length);
                this._initialize(workspaces);
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: msg});
            }
        });


    },
    _getCurrentWorkspaceRecord: function(){
        var currentWorkspaceOid = this.getContext().getWorkspace().ObjectID;
        var record = this.workspaces[0];
        Ext.each(this.workspaces, function(workspace){
            if (workspace.get('ObjectID') == currentWorkspaceOid){
                record = workspace;
                return false;
            }
        });
        return record;
    },
    _initialize: function(workspaces){
        this.workspaces = workspaces;
        this.selectedWorkspaces = [this._getCurrentWorkspaceRecord()];

        this.down('#select_box').add({
            xtype: 'rallydatefield',
            itemId: 'dt-start',
            labelAlign: 'right',
            fieldLabel: 'Start Date',
            margin: 10,
        });
        this.down('#select_box').add({
            xtype: 'rallydatefield',
            itemId: 'dt-end',
            fieldLabel: 'End Date',
            labelAlign: 'right',
            margin: 10,
            value: new Date()
        });

        this.down('#select_box').add({
            xtype: 'rallybutton',
            text: 'Workspaces...',
            scope: this,
            margin: 10,
            handler: this._selectWorkspaces
        });


        this.down('#select_box').add({
            xtype: 'rallybutton',
            text: 'Update',
            margin: 10,
            listeners: {
                scope: this,
                click: this._updateChart
            }
        });

        this.down('#select_box').add({
            xtype: 'rallybutton',
            text: 'Export',
            itemId: 'btn-export',
            margin: 10,
            disabled: true,
            listeners: {
                scope: this,
                click: this._exportData
            }
        });
        this._createChart();

    },
    _selectWorkspaces: function(){
        this.logger.log('_selectWorkspaces', this.workspaces);
        Ext.create('Rally.technicalservices.dialog.PickerDialog',{
            records: this.workspaces,
            selectedRecords: this.selectedWorkspaces,
            displayField: 'Name',
            listeners: {
                scope: this,
                itemselected: this._workspacesSelected
            }
        });
    },
    _workspacesSelected: function(records){
        this.logger.log('_workspacesSelected', records);
        this.selectedWorkspaces = records;
        this._createChart();
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
    _createChart: function(){
        this.logger.log('_createChart');  
        this.setLoading('Calculating...');
        this.down('#btn-export').setDisabled(true);
        
        this._getWorkspaceHistories('projects').then({
            scope: this,
            success: function(histories){
                
                this.logger.log("Found histories:", histories);
                
                // 1.) Get an array of all the days between the first rev-hist and today (x-axis - categories)).
                var first_date = this._getEarliestRevisionDate(histories);
                this.logger.log("First revision-history date = ",first_date);
                var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(new Date(first_date),new Date(),false);
                this.logger.log("Total days covered", array_of_days);
                
                this.down('#dt-start').setMinValue(first_date);
                this.down('#dt-start').setValue(first_date);
                this.down('#dt-end').setMaxValue(new Date());
                this.down('#dt-end').setValue(new Date());
                
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
                
                this.down('#btn-export').setDisabled(false);
                this._makeChart(array_of_days,series);
                this.setLoading(false);
            },
            failure: function(error_message){
                alert(error_message);
            }
        });       
    },
    _updateChart: function(){
        this.setLoading('Redrawing chart...');
        
        var categories = Ext.clone(this.down('#chart-project-growth').chartConfig.xAxis[0].categories);
        var series = Ext.clone(this.down('#chart-project-growth').chartData.series);  
        
        var x_min = Ext.util.Format.date(this.down('#dt-start').getValue(),'Y-m-d');
        var x_max = Ext.util.Format.date(this.down('#dt-end').getValue(),'Y-m-d');
        var x_min_ordinal = 0;
        var x_max_ordinal = categories.length-1;
        
        for (var i=0; i < categories.length; i++){
            var category_date = Ext.util.Format.date(categories[i],'Y-m-d');
            if (x_min == category_date){
                x_min_ordinal = i;
            }
            if (x_max == category_date){
                x_max_ordinal = i;
            }
        }

        this.logger.log('_updateChart',categories, series,x_min_ordinal, x_max_ordinal);
        
        this._redrawChart(categories,series,x_min_ordinal, x_max_ordinal);
        this.setLoading(false);
    },
    _redrawChart: function(categories,serieses,x_min, x_max){
        this.down('#display_box').removeAll();
        this.down('#display_box').add({
            xtype:'rallychart',
            itemId:  'chart-project-growth',
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
                    categories:  categories,
                    labels: {
                        align: 'left',
                        rotation: 70
                    },
                    min: x_min,
                    max: x_max
                }],
                plotOptions: {
                    series: {
                        marker: { enabled: false },
                        stacking: 'normal'
                    }
                }
            },
            listeners: {
                scope: this,
                afterrender: function(chart){
                    chart._unmask();
                }
            }
        });   
   },
    
    _makeChart: function(categories,serieses){
        this.logger.log('_makeChart');

        var formatted_categories = [];
        for (var i=0; i < categories.length; i++){
            var category_date = Ext.util.Format.date(categories[i],'Y-m-d');
            formatted_categories.push(category_date);
        }

        var x_min = 0;
        var x_max = formatted_categories.length-1;

        this._redrawChart(formatted_categories, serieses, x_min, x_max)
     },  
    _exportData: function(serieses){
        var serieses = null;
        var categories = null; 
        if (this.down('#chart-project-growth')){
            serieses = this.down('#chart-project-growth').chartData.series;  
            categories = this.down('#chart-project-growth').chartConfig.xAxis[0].categories;  
        }
        console.log(this.down('#chart-project-growth'), serieses, categories);
        if (serieses == null || categories == null){
            alert('No chart data to export!');
            return;  
        }
        this.logger.log('_exportData', serieses);
        
        var start_date = Ext.util.Format.date(this.down('#dt-start').getValue(),'Y-m-d');
        var end_date = Ext.util.Format.date(this.down('#dt-end').getValue(),'Y-m-d');
        var start_index = 0;
        var end_index = categories.length-1; 
        for (var i = 0; i< categories.length;  i++){
            if (categories[i] == start_date) {
                start_index = i;
            }
            if (categories[i] == end_date){
                end_index = i
            }
        }
        console.log(start_index, end_index);
        var text = "Workspace,";
        for (var i = start_index;  i <= end_index; i++){
            text += categories[i] + ',';
        }
        text = text.replace(/,$/,'\n');

        Ext.each(serieses, function(series){
            var name = '';
            if (series && series.name){
                name = series.name; 
            }

            text += Ext.String.format("{0},",name);
            for (var i = start_index;  i <= end_index; i++){
                text += series.data[i]; 
                text += ',';
            }
            text = text.replace(/,$/,'\n');
        },this);
        
        var file_name = Rally.util.DateTime.format(new Date(),'yyyy-MM-dd_hh-mm-ss-') + this.EXPORT_FILE_NAME;
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
    _getWorkspaceHistories: function(state_field){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var promises = [];

        Ext.each(this.selectedWorkspaces, function(workspace){
            var p = function(){
                return me._getHistoryForRecord(workspace,state_field);
            }
            promises.push(p);
        },this);

        me.logger.log('Open workspaces',promises.length);
        Deft.Chain.parallel(promises).then({
            success: function(histories) {
                deferred.resolve(histories);
            },
            failure: deferred.reject
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
                        this.logger.log('No ' + state_field + ' matching revs or history for workspace: ', record.get('Name'));
                        deferred.resolve({});
                    }
                }
            }
        });
        return deferred.promise;        
    },
    fetchWorkspaces: function(){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Subscription',
            fetch: ['Workspaces'],
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store, records, success){

                    if (success){
                        records[0].getCollection('Workspaces',{
                            fetch: ['ObjectID','Name','State','RevisionHistory','Projects:summary[State]'],
                            limit: 'Infinity',
                            buffered: false
                        }).load({
                            callback: function(records, operation, success){
                                var workspaces = [];
                                if (operation.wasSuccessful()){
                                    Ext.Array.each(records,function(record){
                                        var summaryInfo = record.get('Summary').Projects;
                                        var open_project_count = summaryInfo.State['Open'];
                                        if (record.get('State') == 'Open' && open_project_count > 0){
                                            record.set("id", record["ObjectID"]);
                                            workspaces.push(record);
                                        }
                                    },this);

                                    deferred.resolve(workspaces);
                                } else {
                                    deferred.reject('Error loading workspace information: ' + operation.getError());
                                }
                            }
                        });
                    } else {
                        deferred.reject('Error querying Subscription');
                    }
                }
            }
        });
        return deferred;
    }

});