Ext.define('Rally.technicalservices.util.Parser', {
    singleton: true,
    /*
     * Read through a text string to find the old and new values
     * for a field that changed
     * 
     * {String} field_name, the name of the field that has a change
     * {String} text_string, the string to test (usually the description of a revision)
     * 
     * returns a hash with three keys: 
     * 
     * description: {String} the text_string that was passed in
     * original_value: {String} the value that the field had before the change happened
     * new_value: {String} the value the field changed into
     */
    findValuesForField: function(field_name, text_string){
        var description = text_string;
        var new_value = null;
        var original_value = null;
        
        // looking for "..., FIELD changed from [old] to [new], ..."
        var regex = new RegExp( Ext.util.Format.uppercase(field_name) + " changed from \\[(.*?)\\] to \\[(.*?)\\]" );
        var matches = this._getMatches(text_string, regex);

        if ( matches.length > 0 ) { original_value = matches[0]; }
        if ( matches.length > 1 ) { new_value = matches[1]; }
        
        if ( original_value === null && new_value === null ) {
            // maybe the format is like
            // FIELD added [new]
            regex = new RegExp( Ext.util.Format.uppercase(field_name) + " added \\[(.*?)\\]" );
            matches = this._getMatches(text_string, regex);
    
            if ( matches.length > 0 ) { 
                new_value = matches[0]; 
                original_value = "";
            }
        }
        return {
            description: text_string,
            new_value: new_value,
            original_value: original_value
        };
    },
    /**
     * given an array of revision objects, find the first revision that changed to the first state and the last
     * revision that changed to the last state
     * 
     * return a two-value array (two revisions) or an empty array (if neither or only one state revision is found)
     */
    findEntryExitRevisions: function(revision_array, field_name, start_state, end_state) {
        var matching_revisions = [];
        var start_revision = null;
        var end_revision = null;
        
        Ext.Array.each( revision_array, function(revision){
            var values = this.findValuesForField(field_name, revision.get('Description'));
            
            if ( !start_revision && values.new_value == start_state ) {
                start_revision = revision;
            }
            
            if ( values.new_value == end_state ) {
                end_revision = revision;
            }
        },this);
        
        if ( end_revision && ! start_revision) {
            // we got to the end without seeing the start.  
            // if the first rev is the original then let's assume it was our start
            if ( revision_array[0].get('Description') == "Original revision" ){
                start_revision = revision_array[0];
            }
        }
        
        if ( start_revision && end_revision ) {
            matching_revisions = [ start_revision, end_revision];
        }
        
        return matching_revisions;
    },
    _getMatches: function(string, regex, index) {
        var matches = [];
        var all_matches = regex.exec(string);
        if ( Ext.isArray(all_matches) ) {
            for ( var i=1;i<all_matches.length;i++){
                matches.push(all_matches[i]);
            }
        }
        return matches;
    }
});