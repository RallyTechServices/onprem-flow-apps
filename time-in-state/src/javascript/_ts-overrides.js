Ext.override(Rally.ui.picker.FieldPicker, {
    _shouldShowField: function(field) {
        var allowed_display_fields = ['Owner','Project','State','ScheduleState','Iteration','Release','PreliminaryEstimate','Parent','PortfolioItem','PlanEstimate'];
        var forbidden_display_fields  = ['DragAndDropRank'];
        if (!field.hidden && field.attributeDefinition && !Ext.Array.contains(forbidden_display_fields, field.name)){
            var attr_def = field.attributeDefinition;
            var can_use = false;
            if ( attr_def.ElementName == "State" ) {
                can_use = true;
            }

            if (attr_def.AttributeType == 'STRING' || attr_def.AttributeType == 'INTEGER' ||
            attr_def.AttributeType =='BOOLEAN' || attr_def.AttributeType == 'DECIMAL' ||
            attr_def.AttributeType == 'DATE'){
                can_use = true;
            }

            if (Ext.Array.contains(allowed_display_fields, field.name)){
                can_use = true;
            }

            return can_use
        }
        return false;
    }
});

Ext.define('Rally.technicalservices.DropdownFieldComboBox',{
    extend: 'Rally.ui.combobox.FieldComboBox',
    alias: 'widget.tsdropdownfieldcombobox',
    _isNotHidden: function(field) {
        var allowed_non_string_fields =['State','ScheduleState','InvestmentCategory'];
        var hidden = true;
        if (!field.hidden && field.attributeDefinition ){
            if (field.attributeDefinition.AttributeType == 'STRING' && field.attributeDefinition.Constrained){
                hidden = false;
            }
            if (Ext.Array.contains(allowed_non_string_fields, field.name)){
                hidden = false;
            }
        }
        return !hidden;
    }
});
