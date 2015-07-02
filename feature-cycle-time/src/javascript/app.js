Ext.define("feature-cycle-time", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    config: {
        defaultSettings: {
            typePath: 'portfolioitem/feature',
            stateField: 'State',
            doneState: 'Completed'
        }
    },
    items: [
        {xtype:'container',itemId:'ct_header', layout: {type: 'hbox'}},
        {xtype:'container',itemId:'ct_body'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._initApp();
    },
    _buildGrid: function(){

        this.down('#ct_body').removeAll();
        var start_state = this.down('#cb-start-state').getValue(),
            end_state = this.down('#cb-end-state').getValue();
        this.logger.log('states', start_state, end_state);

        if (!start_state || !end_state){
            this.down('#ct_body').add({
                xtype: 'container',
                html: 'Please select a start and end state and click update to run.',
                flex: 1,
                style: {
                    textAlign: 'center'
                }
            });
            return;
        }

        var model = this.model,
            stateField = this.field,
            allowedValues = this._getStatesOfInterest(start_state, end_state, this.allowedValues);

        var cycle_model = Rally.technicalservices.ModelBuilder.build(model, allowedValues, stateField.name);
        this.logger.log('model', cycle_model);

        var store = Ext.create('Rally.data.wsapi.Store',{
            pageSize: 200,
            model: cycle_model,
            fetch: ['RevisionHistory',stateField.name,'Revisions','FormattedID','Name','ObjectID','PreliminaryEstimate'],
            limit: 'Infinity',
            autoLoad: true,
            listeners: {
                load: function(store, records){
                    _.each(records, function(r){
                        r.calculate();
                    });
                }
            }
        });

        var columnCfgs = [{
            text: 'Name',
            dataIndex: 'Name',
            _csvIgnoreRender: true,
            flex: 3
        },{
            text: 'Preliminary Estimate',
            dataIndex: 'PreliminaryEstimate'
        }];

        var field = Rally.technicalservices.ModelBuilder.getTotalField(allowedValues);
        field.renderer = this._cycleTimeFieldRenderer;
        field.flex = 1;
        columnCfgs.push(field);

        _.each(allowedValues, function(v){
            if (v.length > 0 ) {
                var field = Rally.technicalservices.ModelBuilder.getCycleTimeField(v);
                field.renderer = this._cycleTimeFieldRenderer;
                field.flex = 2;
                columnCfgs.push(field);


                var start_field = Rally.technicalservices.ModelBuilder.getCycleTimeStartDateField(v);
                start_field.renderer = this._dateRenderer;
                start_field.flex = 2;
                columnCfgs.push(start_field);

                field = Rally.technicalservices.ModelBuilder.getCycleTimeEndDateField(v);
                field.renderer = this._dateRenderer;
                field.flex = 2;
                columnCfgs.push(field);
            }
        }, this);

        if (this.down('#grid-cycletime')){
            this.down('#grid-cycletime').destroy();
        }

        this.down('#ct_body').add({
            xtype: 'rallygrid',
            itemId: 'grid-cycletime',
            store: store,
            showRowActionsColumn: false,
            columnCfgs: columnCfgs
        });
    },
    _getStatesOfInterest: function(start_state, end_state, allowed_values){
        var start_idx = _.indexOf(allowed_values, start_state),
            end_idx = _.indexOf(allowed_values, end_state);

        return allowed_values.slice(start_idx, end_idx+1);
    },
    _cycleTimeFieldRenderer: function(v, m, r){
        m.tdCls = 'line-column';
        if (v >= 0){
            return v;
        }
    },
    _dateRenderer: function(v, m ,r){
        if (v) {
            return Rally.util.DateTime.formatWithDefault(Rally.util.DateTime.fromIsoString(v));
        }
    },
    _export: function(){
        var csv = Rally.technicalservices.FileUtilities.getCSVFromGrid(this.down('#grid-cycletime'));
        Rally.technicalservices.FileUtilities.saveAs(csv, 'export.csv');
    },
    _initApp: function(){

        Rally.data.ModelFactory.getModel({
            type: this.getSetting('typePath'),
            scope: this,
            success: function(model) {
                var field = model.getField(this.getSetting('stateField'));
                if (field){
                    field.getAllowedValueStore().load({
                        scope: this,
                        sorters: [{
                            property: 'ValueIndex',
                            direction: 'ASC'
                        }],
                        scope: this,
                        callback: function(records, operation, success){
                            if (success) {
                                var allowedValues = _.map(records, function (r) {
                                    return r.get('StringValue')
                                });
                                this._initComponents(allowedValues);
                                this.model = model;
                                this.allowedValues = allowedValues;
                                this.field = field;
                                this._buildGrid();

                            } else {
                                Rally.ui.notify.Notifier.showError({message: Ext.String.format('Unable to load allowed values for state field "{0}".  Error(s): [{1}]',
                                    this.getSetting('stateField'),
                                    operation.error.errors.join(',')
                                )});
                            }
                        }
                    });
                } else {
                    Rally.ui.notify.Notifier.showError({message: Ext.String.format('Unable to load allowed values for state field "{0}". The field does not exist on the PortfolioItem type model.',
                        this.getSetting('stateField')
                    )});
                }
            }
        });
    },
    _initComponents: function(allowedValues){
        this.logger.log('_initApp', this.getSetting('typePath'), this.getSetting('stateField'));

        var header_ct = this.down('#ct_header');

        var cb_start = header_ct.add({
            xtype: 'rallycombobox',
            fieldLabel: 'Start State',
            labelAlign: 'right',
            itemId: 'cb-start-state',
            margin: 10,
            stateful: true,
            stateId: this.getContext().getScopedStateId('cb-start'),
            store: allowedValues
        });


        var cb_end = header_ct.add({
            xtype: 'rallycombobox',
            fieldLabel: 'End State',
            labelAlign: 'right',
            itemId: 'cb-end-state',
            margin: 10,
            stateful: true,
            stateId: this.getContext().getScopedStateId('cb-end'),
            store: allowedValues
        });
        //cb_end.setValue(allowedValues.slice(-1)[0]);

        header_ct.add({
            xtype: 'rallybutton',
            text: 'Update',
            margin: 10,
            listeners: {
                scope: this,
                click: this._buildGrid
            }
        });

        header_ct.add({
            xtype: 'rallybutton',
            text: 'Export',
            margin: 10,
            listeners: {
                scope: this,
                click: this._export
            }
        });

    }

 });
