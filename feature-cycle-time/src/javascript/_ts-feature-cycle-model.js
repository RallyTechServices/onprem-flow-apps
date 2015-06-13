Ext.define('Rally.technicalservices.ModelBuilder',{
    singleton: true,

    getCycleTimeEndDateField: function(s){
        return {dataIndex: s + '_end_date', text: s + ' End Date'};
    },

    getCycleTimeStartDateField: function(s){
        return {dataIndex: s + '_start_date', text: s + ' Start Date'};
    },

    getCycleTimeField: function(s){
        return {dataIndex: s + '_cycle_time', text: s};
    },

    build: function(model, states, state_field ){

        var fields = [];
        _.each(states, function(s){
            if (s.length > 0) {
                fields.push({
                    name: Rally.technicalservices.ModelBuilder.getCycleTimeField(s).dataIndex,
                    type: 'float',
                    defaultValue: -1,
                    displayName: Rally.technicalservices.ModelBuilder.getCycleTimeField(s).text
                });
                fields.push({
                    name: Rally.technicalservices.ModelBuilder.getCycleTimeStartDateField(s).dataIndex,
                    type: 'date',
                    defaultValue: null,
                    displayName: Rally.technicalservices.ModelBuilder.getCycleTimeStartDateField(s).text
                });
                fields.push({
                    name: Rally.technicalservices.ModelBuilder.getCycleTimeEndDateField(s).dataIndex,
                    type: 'date',
                    defaultValue: null,
                    displayName: Rally.technicalservices.ModelBuilder.getCycleTimeEndDateField(s).text
                });
            }
        });

        return Ext.define('Rally.technicalservices.model.ArtifactCycleTime',{
            extend: model,
            fields: fields,
            stateField: state_field,
            stateList: states,
            skipWeekends: false,


            calculate: function(){
                this._getHistory().then({
                    scope: this,
                    success: this._calculateHistory,
                    failure: function(operation){
                        Rally.ui.notify.Notifier.showError({message: 'Error getting revision history: ' + operation.error.errors.join(',')});
                    }
                });
            },
            _calculateHistory: function(revisions){


                if (!revisions){
                    console.log('no revisions', this.get('FormattedID'));
                    return;
                }

                this.set('_revisions', revisions);

                _.each(this.stateList, function(state){
                    if (state.length > 0) {
                        var state_cycle_field_name = Rally.technicalservices.ModelBuilder.getCycleTimeField(state).dataIndex,
                            state_cycle_start_name = Rally.technicalservices.ModelBuilder.getCycleTimeStartDateField(state).dataIndex,
                            state_cycle_end_name = Rally.technicalservices.ModelBuilder.getCycleTimeEndDateField(state).dataIndex,
                            found_revisions = Rally.technicalservices.util.Parser.findStateRevisions(revisions, this.stateField, state);

                        console.log("Found pair of revisions:", found_revisions);

                        if (found_revisions.length == 2) {
                            var start_date = found_revisions[0].get('CreationDate');
                            var end_date = found_revisions[1].get('CreationDate');

                            var cycle_time = Rally.technicalservices.util.Utilities.daysBetween(end_date, start_date, this.skipWeekends);
                            console.log("do math on ", start_date, end_date, cycle_time);
                            this.set(state_cycle_start_name, start_date);
                            this.set(state_cycle_end_name, end_date);
                            this.set(state_cycle_field_name, cycle_time);
                        }
                    }
                },this);

            },
            _getHistory: function(){
                var deferred = Ext.create('Deft.Deferred');

                if (this.get('_revisions')){
                    deferred.resolve(this.get('_revisions'));
                }
                console.log('getting history for ', this.get('FormattedID'));

                // contains searches are case insensitive, so
                // TODO: deal with possibility that the name of the field is in the description change
                //       without changing the field itself (like in the name or something)
                var state_selection_filters = Ext.create('Rally.data.wsapi.Filter',{
                    property:'Description',
                    operator:'contains',
                    value: Ext.util.Format.uppercase(this.stateField)
                }).or(Ext.create('Rally.data.wsapi.Filter',{
                    property:'Description',
                    value:'Original revision'
                }));

                var rev_history_filter = Ext.create('Rally.data.wsapi.Filter',{
                    property:"RevisionHistory.ObjectID",
                    value: this.get('RevisionHistory').ObjectID
                });

                var filters = rev_history_filter.and(state_selection_filters);

                var store = Ext.create('Rally.data.wsapi.Store',{
                    model:'Revision',
                    filters: filters,
                    fetch: ['Description','CreationDate'],
                    sorters: [{property:'CreationDate',direction:'ASC'}]
                });
                store.load({
                    scope: this,
                    callback: function(revisions, operation, success){
                        if (success){
                            deferred.resolve(revisions);
                        } else {
                            deferred.reject(operation);
                        }
                    }
                });
                return deferred.promise;
            }
        });
    }
});
