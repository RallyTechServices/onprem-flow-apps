Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._getWorkspaces('projects').then({
            scope: this,
            success: function(histories){
                this.setLoading('Calculating...');
                this.logger.log("Found histories:", histories.length, histories);
                
                // 1.) Get an array of all the days between the first rev-hist and today (x-axis - categories)).
                var first_date = new Date(); // date = Fri Jan 02 2009 07:36:56 GMT-0700 (MST)
                var ws_name = 'WS Name here';
                Ext.Object.each(histories[0],function(key,history){
                    var revdate = history.revisions[0].get('CreationDate');
                    ws_name = history.record.get('Name');
                    if (revdate < first_date) {
                        first_date = revdate;
                    }
                });
                this.logger.log("First revision-history date = ",first_date);
                var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(new Date(first_date),new Date(),false);
                this.logger.log("Total days covered = ",array_of_days);
                
                // 2.) Cycle thru the revisions and make a running count (y-axis - series)
                var count_hash = {};
                var counter = 1; // Allow for Rally's 'Sample' project which never shows up in rev hist.
                Ext.Array.each(array_of_days,function(day){
                    Ext.Object.each(histories[0],function(key,history){
                        Ext.Array.each(history.revisions,function(revision){
                            var revdate = revision.get('CreationDate');
                            if (revdate > day && revdate < Rally.util.DateTime.add(day,'day',+1)) {
                                counter++;
                            }
                        });
                       
                    });
                    count_hash[day] = counter;
                });
                var series_data = [];
                Ext.Object.each(count_hash,function(day,value){
                    series_data.push(value);
                });
                var series = {type:'area',name:ws_name,stack:1,data:series_data};
                
                // 3.) Make chart
                this.setLoading(false);
                this._makeChart(array_of_days,[series]);
            },
            failure: function(error_message){
                alert(error_message);
            }
        });
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
    },
        
    _getWorkspaces: function(state_field){
        var deferred = Ext.create('Deft.Deferred');
        this.setLoading('Get WS data...');
        var model = 'Workspace';
        var me = this;
        this.logger.log("Getting ", model, ".", state_field);
        
        //var state_field_name = state_field;

        Ext.create('Rally.data.wsapi.Store', {
            model: model,
            fetch: ['Name','ObjectID','RevisionHistory'],
            limit: 600,
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store, records, successful) {
                    if (successful){
                        this.logger.log("Found workspaces:", records.length, records);
                        var promises = [];
                        Ext.Array.each(records,function(record){
                            var p = function(){
                                return me._getHistoryForRecord(record,state_field);
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
                        deferred.reject('Failed to load store for model [' + model + ']');
                    }
                }
            }
        });
        return deferred.promise;
    },
    
    _getHistoryForRecord: function(record,state_field) {
        var deferred = Ext.create('Deft.Deferred');
        this.setLoading('Get Revision data...');
        this.logger.log('getting history for ', record.get('Name'));
        
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
            filters: filters,
            limit: 'Infinity',
            fetch: ['Description','CreationDate'],
            sorters: [{property:'CreationDate',direction:'ASC'}],
            listeners: {
                scope: this,
                load: function(store,revisions){
                    //this.logger.log('revs for ', record.get('FormattedID'), ':',revisions);
                    var rev_hash = {};
                    var matching_revs = [];
                    Ext.Array.each(revisions,function(rev){
                        var description = rev.get('Description');
                        var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('projects', description);
                        if (parsed_result.new_value != null) {
                            matching_revs.push(rev);
                        }
                    });
                    if ( matching_revs.length > 1 ) {
                        rev_hash[record.get('ObjectID')] = {record: record, revisions: matching_revs};
                    }
                    deferred.resolve(rev_hash);
                }
            }
        });

        return deferred.promise;        
    }
});