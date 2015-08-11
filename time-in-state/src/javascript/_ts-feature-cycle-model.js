Ext.define('Rally.technicalservices.ModelBuilder',{
    singleton: true,

    getCycleTimeEndDateField: function(s){
        return {dataIndex: s + '_end_date', text: 'End'};
    },

    getCycleTimeStartDateField: function(s){
        return {dataIndex: s + '_start_date', text: 'Start'};
    },

    getCycleTimeField: function(s){
        return {dataIndex: s + '_cycle_time', text: s};
    },
    getTotalField: function(states){
        return {dataIndex: 'total', text: Ext.String.format('Total days ({0} to {1})',states[0], states[states.length-1])};
    },

    build: function(model, states, state_field , state_field_display_name){

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
        fields.push({
            name: 'total',
            type: 'float',
            defaultValue: -1,
            displayName: Ext.String.format('Total days ({0} to {1})',states[0], states.slice(-1)[0])
        });

        return Ext.define('Rally.technicalservices.model.ArtifactCycleTime',{
            extend: model,
            fields: fields,
            stateField: state_field,
            stateFieldDisplayName: state_field_display_name,
            stateList: states,
            skipWeekends: false,


            calculate: function(){
                var deferred = Ext.create('Deft.Deferred');
                this._getHistory().then({
                    scope: this,
                    success: function(records){
                        this._calculateHistory(records)
                        deferred.resolve();
                    },
                    failure: function(operation){
                        Rally.ui.notify.Notifier.showError({message: 'Error getting revision history for ' + this.get('FormattedID') + ': ' + operation.error.errors.join(',')});
                        deferred.resolve();
                    }
                });
                return deferred;
            },
            _calculateHistory: function(revisions){
                if (!revisions){
                    return;
                }

                this.set('_revisions', revisions);
                var time_in_states = Rally.technicalservices.util.Parser.getTimeInStates(revisions, this.stateFieldDisplayName, this.skipWeekends);

                _.each(time_in_states, function(obj, state){
                    if (state.length > 0 && Ext.Array.contains(this.stateList, state)) {
                        var state_cycle_field_name = Rally.technicalservices.ModelBuilder.getCycleTimeField(state).dataIndex,
                            state_cycle_start_name = Rally.technicalservices.ModelBuilder.getCycleTimeStartDateField(state).dataIndex,
                            state_cycle_end_name = Rally.technicalservices.ModelBuilder.getCycleTimeEndDateField(state).dataIndex;

                        this.set(state_cycle_start_name, obj.startDate || null);
                        this.set(state_cycle_end_name, obj.endDate || null);
                        this.set(state_cycle_field_name, obj.timeInState || -1);
                    }
                }, this);

                var start_state = this.stateList[0],
                    end_state = this.stateList[this.stateList.length - 1];

                if (time_in_states[start_state] && time_in_states[end_state]){
                    var start_date = time_in_states[start_state].startDate,
                        end_date = time_in_states[end_state].startDate;
                    this.set('total', Rally.technicalservices.util.Utilities.daysBetweenWithFraction(end_date, start_date, this.skipWeekends));
                }
            },
            _getHistory: function(){
                var deferred = Ext.create('Deft.Deferred');

                if (this.get('_revisions')){
                    deferred.resolve(this.get('_revisions'));
                }

                // contains searches are case insensitive, so
                // TODO: deal with possibility that the name of the field is in the description change
                //       without changing the field itself (like in the name or something)
                var state_selection_filters = Ext.create('Rally.data.wsapi.Filter',{
                    property:'Description',
                    operator:'contains',
                    value: Ext.util.Format.uppercase(this.stateFieldDisplayName)
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
