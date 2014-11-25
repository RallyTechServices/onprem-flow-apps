Ext.define('Rally.technicalservices.SettingsDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tssettingsdialog',
    config: {
        /* default settings. pass new ones in */
        title: 'Settings',
        model: 'HierarchicalRequirement'
    },
    items: {
        xtype: 'panel',
        border: false,
        layout: { type: 'hbox' },
        defaults: {
            padding: 5,
            margin: 5
        },
        items: [
            { 
                xtype: 'container', 
                items: [{
                    xtype: 'container',
                    itemId: 'model_selector_box'
                },
                {
                    xtype: 'container',
                    itemId: 'state_field_selector_box'
                },
                {
                    xtype: 'container',
                    itemId: 'state_field_start_value_selector_box'
                },
                {
                    xtype: 'container',
                    itemId: 'state_field_end_value_selector_box'
                }]
            },
            { 
                xtype: 'container',
                items: [
                    {
                        xtype: 'container',
                        itemId: 'start_date_selector_box'
                    },
                    {
                        xtype: 'container',
                        itemId: 'end_date_selector_box'
                    }
                ]
            }
        ]
    },
    logger: new Rally.technicalservices.Logger(),
    
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
    },
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event settingsChosen
             * Fires when user clicks done after making settings choices
             * @param {Rally.technicalservices.SettingsDialog} this
             * @param {hash} config settings
             */
            'settingsChosen',
            /**
             * @event cancelChosen
             * Fires when user clicks the cancel button
             */
            'cancelChosen'
        );

        this._buildButtons();
        this._addChoosers();

    },
    _buildButtons: function() {
        this.down('panel').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    text: 'Save',
                    scope: this,
                    userAction: 'clicked done in dialog',
                    itemId: 'save_button',
                    disabled: true,
                    handler: function() {
                        this.fireEvent('settingsChosen', this, this._getConfig());
                        this.close();
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    handler: function() {
                        this.fireEvent('cancelChosen');
                        this.close();
                    },
                    scope: this
                }
            ]
        });
    },
    _getConfig: function() {
        var me = this;
        var config = {
            start_date: this.start_date,
            end_date: this.end_date,
            model: this.model,
            state_field: this.state_field,
            start_state: this.start_state,
            end_state: this.end_state
        };
        
        return config;
    },
    _addChoosers: function() {
        this._addModelChooser();
        this._addDateChoosers();
    },
    _addDateChoosers: function() {
        this.down('#start_date_selector_box').add({
            xtype:'rallydatefield',
            fieldLabel: 'Start Date',
            labelWidth: 75,
            stateful: true,
            stateId: 'rally.technicalservices.cycletime.start_date_chooser',
            stateEvents: ['change'],
            listeners: {
                scope: this,
                change: function(timebox) {
                    this.start_date = timebox.getValue();
                    this.logger.log("Start date chosen: ", this.start_date);
                    this._enableButtonIfNecessary();
                }
            }
        });
        this.down('#end_date_selector_box').add({
            xtype:'rallydatefield',
            fieldLabel: 'End Date',
            labelWidth: 75,
            stateful: true,
            stateId: 'rally.technicalservices.cycletime.end_date_chooser',
            stateEvents: ['change'],
            listeners: {
                scope: this,
                change: function(timebox) {
                    this.end_date = timebox.getValue();
                    this.logger.log("Start date chosen: ", this.end_date);
                    this._enableButtonIfNecessary();
                }
            }
        });
    },
    _addModelChooser: function() {
        var me = this;
        me.logger.log('_addModelChooser:type', me.model);
        this.down('#model_selector_box').add({
            xtype:'rallycombobox',
            itemId: 'model_chooser',
            displayField: 'DisplayName',
            valueField:'TypePath',
            autoExpand: true,
            stateful: true,
            stateId: 'rally.technicalservices.cycletime.model_chooser',
            stateEvents: ['select'],
            storeConfig: {
                autoLoad: true,
                model:'TypeDefinition',
                filters: [
                  {property:'Creatable',value:true},
                  {property:'Restorable',value:true}                ]
            },
            fieldLabel: 'Artifact Type',
            labelWidth: 75,
            listeners: {
                scope: this,
                select: function(cb,new_value){
                    this.model = cb.getRecord().get('TypePath');
                    this.logger.log("selection of type:", this.model);
                    this._addStateFieldSelector(this.model);
                },
                ready: function(cb){
                    this.model = cb.getRecord().get('TypePath');
                    this.logger.log("ready with type:", this.model);
                    this._addStateFieldSelector(this.model);
                }
            
            }
        });
    },
    _addStateFieldSelector: function(model){
        this.down('#state_field_selector_box').removeAll();
        this.state_field = null;
        
        var cb = Ext.create('Rally.ui.combobox.FieldComboBox',{
            itemId: 'state_field_chooser',
            model: model,
            fieldLabel: 'State Field',
            labelWidth: 75,
            stateful: true,
            stateId: 'rally.technicalservices.cycletime.state_field_chooser',
            stateEvents: ['select'],
            listeners: {
                scope: this,
                change: function(combo) {
                    this.state_field = combo.getRecord();
                    this._addStateFieldValueSelectors(model, this.state_field);
                    this._enableButtonIfNecessary();
                }
            }
        });
        
        cb.getStore().on('load',
            function(store,records) {
                this._filterOutExceptChoices(store,records);
                cb.setValue(store.getAt(0));
            },
            this
        );
        
        cb.getStore().load();
        
        this.down('#state_field_selector_box').add(cb);
    },
    _addStateFieldValueSelectors: function(model,state_field){
        this.down('#state_field_start_value_selector_box').removeAll();
        this.down('#state_field_end_value_selector_box').removeAll();
        
        this.start_state = null;
        this.end_state = null;
        
        this.down('#state_field_start_value_selector_box').add({
            xtype:'rallyfieldvaluecombobox',
            model: model,
            field: state_field.get('value'),
            fieldLabel: 'Start Value',
            labelWidth: 75,
            stateful: true,
            stateId: 'rally.technicalservices.cycletime.start_value_chooser',
            stateEvents: ['change','select'],
            listeners: {
                scope: this,
                change: function(combo) {
                    this.start_state = combo.getRecord();
                    this._enableButtonIfNecessary();
                }
            }
        });
 
        this.down('#state_field_end_value_selector_box').add({
            xtype:'rallyfieldvaluecombobox',
            model: model,
            field: state_field.get('value'),
            fieldLabel: 'End Value',
            labelWidth: 75,
            stateful: true,
            stateId: 'rally.technicalservices.cycletime.end_value_chooser',
            stateEvents: ['change','select'],
            listeners: {
                scope: this,
                change: function(combo) {
                    this.end_state = combo.getRecord();
                    this._enableButtonIfNecessary();
                }
            }
        });
        
    },
    _filterOutTextFields: function(field){
        var attribute_defn = field.attributeDefinition;
        
        if ( ! attribute_defn ) {
            return false;
        }
        if ( attribute_defn.ElementName == "RevisionHistory" ) {
            return false;
        }
        if ( attribute_defn ) {
            var attribute_type = attribute_defn.AttributeType;
            if ( attribute_type == "TEXT" ) {
                return Ext.Array.contains(this.multi_field_list,field.name);
                return false;
            }
        } else {
            return false;
        }
        return true;
    },
    _filterInPossibleMultiFields: function(field){
        var attribute_defn = field.attributeDefinition;
        if ( field.name == "Description" || field.name == "Notes" ) {
            return false;
        }
        if ( attribute_defn ) {
            var attribute_type = attribute_defn.AttributeType;
            if ( attribute_type == "TEXT" ) {
                return true;
            }
        } else {
            return false;
        }
        return false;
    },
    _filterOutExceptChoices: function(store,records) {
        store.filter([{
            filterFn:function(field){ 
                if ( field && field.get('fieldDefinition') && field.get('fieldDefinition').attributeDefinition) {
                    var attribute_type = field.get('fieldDefinition').attributeDefinition.AttributeType;
    
                    if ( attribute_type == "STRING" || attribute_type == "STATE" ) {
                        if ( field.get('fieldDefinition').attributeDefinition.Constrained ) {
                            return true;
                        }
                    }
                    if ( field.get('name') === 'State' ) { 
                        return true;
                    }
                }
                return false;
            } 
        }]);
    },
    _enableButtonIfNecessary:function(){
        var required_fields = [this.start_date, this.end_date, this.model, this.state_field, this.start_state, this.end_state];
        for ( var i=0;i<required_fields.length; i++ ) {
            if ( !required_fields[i] ) {
                this.down('#save_button').setDisabled(true);
                return;
            }
        }
        
        this.down('#save_button').setDisabled(false);
    }
    
});