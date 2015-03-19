Ext.define('Rally.technicalservices.dialog.PickerDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    logger: new Rally.technicalservices.Logger(),
    autoShow: true,
    draggable: true,
    width: 400,
    height: 400,
    config:{
        records: null,
        title: 'Select Workspace',
        displayFields: ['Name'],
        sortField: 'Name',
        sortDirection: 'ASC',
        filterField: 'Name'
    },
    constructor: function(config){
        Ext.apply(this.config,config);
        this.callParent(arguments);
    },
    initComponent: function() {
        this.title = this.getTitle();
        this.items = this._getItems();
        this.buttons = this._getButtonConfig();
        this.callParent(arguments);
        this.addEvents('itemselected');
        this._addItemGrid(this.config.records, this.displayField);
    },
    _getItemCtHeight: function(){
        return this.height - 150;
    },
    _addItemGrid: function(){

        var page_size = this.getRecords().length + 1;
        var data = _.map(this.getRecords(), function(r){return r.getData()});
        var store = Ext.create('Rally.data.custom.Store',{
            data: data,
            remoteSort: false,
            remoteFilter: false,
            pageSize: page_size,
            sorters: [{
                property: this.sortField,
                direction: this.sortDirection
            }]
        });

        var column_cfgs = [];
        Ext.each(this.displayFields, function(f){
            column_cfgs.push({
                text: f,
                dataIndex: f,
                flex: 1
            });
        });

        this.logger.log('_addItemGrid', store);
        this.down('#item_box').add({
            xtype: 'rallygrid',
            store: store,
            itemId: 'ct-item',
            height: this._getItemCtHeight(),
            width: this._getItemCtWidth(),
            margin: 15,
            showRowActionsColumn: false,
            selType: 'checkboxmodel',
            selModel: {
                injectCheckbox: 0,
                mode: 'MULTI'
            },
            columnCfgs: column_cfgs,
            showPagingToolbar: false
        });

        //select the records
        var records = this.records || [];
        this.down('#ct-item').getSelectionModel().select(records);
    },
    _getItemCtWidth: function(){
        return this.width - 30;
    },
    _onApplyClick: function(){
        var selected_records = this.down('#ct-item').getSelectionModel().getSelection();
        this.fireEvent('itemselected',selected_records);
        this.destroy();
    },
    _onCancelClick: function() {
        this.destroy();
    },
    _getItems:function(){
        return [{
//            xtype: "container",
//            layout: {type: 'hbox'},
//            items: [{
//                xtype: 'rallytextfield',
//                itemId: 'txt-find',
//                fieldLabel: 'Filter',
//                labelAlign: 'right',
//                labelWidth: 50,
//                width: this._getItemCtWidth(),
//                margin: 10,
//                height: 21,
//                listeners: {
//                    scope: this,
//                    change: this._onFindUpdated
//                }
//            }]
//        },{
            xtype: "container",
            itemId: 'item_box'
        }];
    },
    _onFindUpdated: function(txt){
        var grid = this.down('#ct-item');
        var filterValue = txt.getValue();
        var filterField = this.filterField;
        var regex = new RegExp(filterValue, "gi");
        grid.getStore().filterBy(function(item){
            return regex.test(item.get(filterField));
        });
    },
    _getButtonConfig: function() {
        return [{
            xtype: "rallybutton",
            itemId: "cancelButton",
            cls: "secondary rly-small",
            text: "Cancel",
            width: 90,
            handler: this._onCancelClick,
            scope: this
        }, {
            xtype: "rallybutton",
            itemId: "applyButton",
            cls: "primary rly-small",
            text: "Apply",
            width: 90,
            handler: this._onApplyClick,
            scope: this,
        }]
    }
});