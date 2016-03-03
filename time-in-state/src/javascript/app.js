Ext.define("time-in-state", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    config: {
        defaultSettings: {
            typePath: 'PortfolioItem/Feature',
            stateField: 'State',
            displayFields: ['Name','PreliminaryEstimate']
        }
    },
    items: [
        {xtype:'container',itemId:'settings_box'},
        {xtype:'container',itemId:'ct_header', layout: {type: 'hbox'}},
        {xtype:'container',itemId:'ct_body'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {

        if (this.isExternal()){
            this.showSettings(this.config);
        } else {
            this.onSettingsUpdate(this.getSettings());
        }
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

        var cycle_model = Rally.technicalservices.ModelBuilder.build(model, allowedValues, stateField.name, stateField.displayName);
        this.logger.log('model', cycle_model);
        var display_fields = this.getSetting('displayFields');
        if (!(display_fields instanceof Array)){
            display_fields = display_fields.split(',');
        }

        var fetch = ['RevisionHistory',stateField.name,'Revisions','FormattedID','Name','ObjectID'].concat(display_fields);

        var store = Ext.create('Rally.data.wsapi.Store',{
            pageSize: 25,
            model: cycle_model,
            fetch: fetch,
            //limit: 'Infinity',
            context: {
                project: this.getContext().getProject()._ref,
                projectScopeUp: this.getContext().getProjectScopeUp(),
                projectScopeDown: this.getContext().getProjectScopeDown()
            },
            listeners: {
                scope: this,
                load: function(store, records, success){
                    this.logger.log('Store Load', records.length);
                    this.setLoading(true);
                    if (success){
                        var promises = [];
                        _.each(records, function(r){
                            promises.push(r.calculate());
                        });
                        Deft.Promise.all(promises).then({
                            scope: this,
                            success: function(){
                                this.setLoading(false);
                            },
                            failure: function(){
                                this.setLoading(false);
                            }
                        });
                    } else {
                        this.setLoading(false);
                        Rally.ui.notify.Notifier.showError({message: 'Error loading artifact records '});
                    }
                }
            }
        });
        store.load();

        var columnCfgs = [];

        _.each(display_fields,function(field){
            var displayName = field;
            if (cycle_model && cycle_model.getField(field)){
                displayName = cycle_model.getField(field).displayName;
            }
            if (field === 'FormattedID'){
                columnCfgs.push({text: displayName, dataIndex: field, exportRenderer: function(v){ return v; } });

            } else {
                columnCfgs.push({text: displayName, dataIndex: field});

            }

        }, this);

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
        Rally.technicalservices.FileUtilities.getCSVFromGridWithPaging(this, this.down('#grid-cycletime')).then({
            success: function(csv){
                Rally.technicalservices.FileUtilities.saveAs(csv, 'export.csv');
            }
        });
    },
    _initApp: function(){

        this._loadAllowedValuesForState(this.getSetting('typePath'),this.getSetting('stateField'));
    },
    _loadAllowedValuesForState: function(modelName, stateField){
        Rally.data.ModelFactory.getModel({
            type: modelName,
            scope: this,
            success: function(model) {
                var field = model.getField(stateField);

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
                                this._initComponents(allowedValues, modelName);
                                this.model = model;
                                this.allowedValues = allowedValues;
                                this.field = field;
                                this._buildGrid();

                            } else {
                                Rally.ui.notify.Notifier.showError({message: Ext.String.format('Unable to load allowed values for state field "{0}".  Error(s): [{1}]',
                                    stateField,
                                    operation.error.errors.join(',')
                                )});
                            }
                        }
                    });
                } else {
                    Rally.ui.notify.Notifier.showError({message: Ext.String.format('Unable to load allowed values for state field "{0}". The field does not exist on the PortfolioItem type model.',
                        stateField
                    )});
                }
            }
        });
    },
    _initComponents: function(allowedValues, modelName){
        this.logger.log('_initApp', modelName);

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

        header_ct.add({
            xtype: 'container',
            flex: 1,
            itemId: 'ct-messages'
        });

    },
    _updateMessages: function(){
        var html = this.messages.join('');
        this.down('#ct-messages').update(html);
    },
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    //showSettings:  Override
    showSettings: function(options) {
        this._appSettings = Ext.create('Rally.app.AppSettings', Ext.apply({
            fields: this.getSettingsFields(),
            settings: this.getSettings(),
            defaultSettings: this.getDefaultSettings(),
            context: this.getContext(),
            settingsScope: this.settingsScope,
            autoScroll: true
        }, options));

        this._appSettings.on('cancel', this._hideSettings, this);
        this._appSettings.on('save', this._onSettingsSaved, this);
        if (this.isExternal()){
            if (this.down('#settings_box').getComponent(this._appSettings.id)===undefined){
                this.down('#settings_box').add(this._appSettings);
            }
        } else {
            this.hide();
            this.up().add(this._appSettings);
        }
        return this._appSettings;
    },
    _onSettingsSaved: function(settings){
        Ext.apply(this.settings, settings);
        this._hideSettings();
        this.onSettingsUpdate(settings);

    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        Ext.apply(this, settings);
        this.logger.log('onSettingsUpdate', settings);
        this._initApp(settings);
    },

    getSettingsFields: function() {

        var filters = Rally.data.wsapi.Filter.or([Ext.create('Rally.data.wsapi.Filter',{
            property: 'TypePath',
            value: 'HierarchicalRequirement'
        }),Ext.create('Rally.data.wsapi.Filter', {
            property: 'TypePath',
            operator: 'contains',
            value: 'PortfolioItem/'
        })]);



        var me = this,
            current_model = this.getSetting('typePath'),
            current_state_field = this.getSetting('stateField');

        return [
           {
                name: 'typePath',
                xtype: 'rallycombobox',
                storeConfig: {
                    model: 'TypeDefinition',
                    fetch: ['TypePath', 'DisplayName'],
                    filters: filters,
                    remoteSort: false,
                    remoteFilter: true
                },
                disabled: true,
                valueField: 'TypePath',
                displayField: 'DisplayName',
                labelAlign: 'right',
                fieldLabel: 'Model Type',
                bubbleEvents: ['change','ready'],
                listeners: {
                    ready: function(cb){
                        cb.setDisabled(false);
                    }
                }
            },{
                name: 'stateField',
                xtype: 'tsdropdownfieldcombobox',
                itemId: 'stateField_setting',
                fieldLabel: 'State Field',
                labelAlign: 'right',
                model: current_model,
                disabled: true,
                handlesEvents: {
                    change: function(type_cb){
                        this.setDisabled(false);
                        this.refreshWithNewModelType(type_cb.getValue());
                    },
                    ready: function(type_cb){
                        this.refreshWithNewModelType(type_cb.getValue());
                        this.setValue(current_state_field);
                        this.setDisabled(false);
                    }
                }
            },{
                name: 'displayFields',
                xtype: 'rallyfieldpicker',
                itemId: 'displayFields_setting',
                fieldLabel: 'Display Fields',
                alwaysSelectedValues: ['Name'],
                labelAlign: 'right',
                modelTypes: [current_model],
                disabled: true,
                handlesEvents: {
                    change: function(type_cb){
                        this.setDisabled(false);
                        this.refreshWithNewModelTypes([type_cb.getValue()]);
                    },
                    ready: function(type_cb){
                        this.refreshWithNewModelTypes([type_cb.getValue()]);
                        this.setDisabled(false);
                    }
                }
            }
        ];
    }
});
