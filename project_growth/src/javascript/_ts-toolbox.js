Ext.define('Rally.technicalservices.Toolbox',{
    singleton: true,
    getBeginningOfMonthAsDate: function(dateInMonth){
        var year = dateInMonth.getFullYear();
        var month = dateInMonth.getMonth();
        return new Date(year,month,1,0,0,0,0);
    },
    getEndOfMonthAsDate: function(dateInMonth){
        var year = dateInMonth.getFullYear();
        var month = dateInMonth.getMonth();
        var day = new Date(year, month+1,0).getDate();
        return new Date(year,month,day,0,0,0,0);
    },
    getBucketStartForGranularity: function(granularity, date){

    },
    getBucketEndForGranularity: function(granularity, date){

    },
    aggregateSnapsByOid: function(snaps){
        //Return a hash of objects (key=ObjectID) with all snapshots for the object
        var snaps_by_oid = {};
        Ext.each(snaps, function(snap){
            var oid = snap.ObjectID || snap.get('ObjectID');
            if (snaps_by_oid[oid] == undefined){
                snaps_by_oid[oid] = [];
            }
            snaps_by_oid[oid].push(snap);

        });
        return snaps_by_oid;
    },
    getDateBuckets: function(startDate, endDate, granularity){

        var bucketStartDate = startDate;
        var bucketEndDate = endDate;
        if (granularity == "month"){
            bucketStartDate = Rally.technicalservices.Toolbox.getBeginningOfMonthAsDate(startDate);
            bucketEndDate = Rally.technicalservices.Toolbox.getEndOfMonthAsDate(endDate);
        }

        var date = bucketStartDate;

        var buckets = [];
        while (date<bucketEndDate && bucketStartDate < bucketEndDate){
            buckets.push(date);
            date = Rally.util.DateTime.add(date,granularity,1);
        }
        return buckets;
    },

    formatDateBuckets: function(buckets, dateFormat){
        var categories = [];
        Ext.each(buckets, function(bucket){
            categories.push(Rally.util.DateTime.format(bucket,dateFormat));
        });
        // categories[categories.length-1] += "*";
        return categories;
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
                            fetch: ['ObjectID','Name','State','Projects:summary[State]'],
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