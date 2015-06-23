Ext.define("feature-cycle-time", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    config: {
        defaultSettings: {
            typePath: 'portfolioitem/feature',
            stateField: 'State'
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
    _buildGrid: function(model, allowedValues, stateField){

        var cycle_model = Rally.technicalservices.ModelBuilder.build(model, allowedValues, stateField.name);
        this.logger.log('model', cycle_model);

        var store = Ext.create('Rally.data.wsapi.Store',{
            pageSize: 200,
            model: cycle_model,
            fetch: ['RevisionHistory',stateField.name,'Revisions','FormattedID','Name','ObjectID'],
            filters: [{
                property: stateField.name,
                operator: '!=',
                value: null
            }],
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
            text: 'Formatted ID',
            dataIndex: 'FormattedID',
            _csvIgnoreRender: true
        }];

        _.each(allowedValues, function(v){
            if (v.length > 0 ) {
                var field = Rally.technicalservices.ModelBuilder.getCycleTimeField(v);
                field.renderer = this._cycleTimeFieldRenderer;
                columnCfgs.push(field);

                var start_field = Rally.technicalservices.ModelBuilder.getCycleTimeStartDateField(v);
                start_field.renderer = this._dateRenderer;
                columnCfgs.push(start_field);

                field = Rally.technicalservices.ModelBuilder.getCycleTimeEndDateField(v);
                field.renderer = this._dateRenderer;
                columnCfgs.push(field);
            }
        }, this);

        console.log('cc',columnCfgs);

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
                        callback: function(records, operation, success){
                            if (success) {
                                var allowedValues = _.map(records, function (r) {
                                    return r.get('StringValue')
                                });
                                this._buildGrid(model, allowedValues, field);
                                this._initComponents();
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
    _initComponents: function(){
        this.logger.log('_initApp', this.getSetting('typePath'), this.getSetting('stateField'));

        var header_ct = this.down('#ct_header');

        header_ct.add({
            xtype: 'rallybutton',
            text: 'Export',
            listeners: {
                scope: this,
                click: this._export
            }
        });
    }

 });
