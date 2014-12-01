describe("Given description strings",function() {

    
    describe("When searching change values for a field",function(){  
        it('should find the old and new values for a given field', function() {
            var description = "STATE changed from [Prep] to [Ready for Dev], STATE CHANGED DATE changed from [Thu Sep 04 10:29:58 MDT 2014] to [Tue Nov 04 17:16:21 MST 2014]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('state', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.original_value).toEqual("Prep");
            expect(parsed_result.new_value).toEqual("Ready for Dev");
            
        });
        it('should find the old and new values for a given field even if other values changed', function() {
            var description = "FRED changed from [ethel] to [lucy], STATE changed from [Prep] to [Ready for Dev], STATE CHANGED DATE changed from [Thu Sep 04 10:29:58 MDT 2014] to [Tue Nov 04 17:16:21 MST 2014]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('state', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.original_value).toEqual("Prep");
            expect(parsed_result.new_value).toEqual("Ready for Dev");
            
        });
        it('should find the old and new values for a given field for schedule state', function() {
            var description = "RANK moved up, SCHEDULE STATE changed from [In-Progress] to [Completed]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('Schedule State', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.original_value).toEqual("In-Progress");
            expect(parsed_result.new_value).toEqual("Completed");
            
        });
        
        it('should not find values if they are not there', function() {
            var description = "RANK moved up, SCHEDULE STATE changed from [In-Progress] to [Completed]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('KanbanStates', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.original_value).toEqual(null);
            expect(parsed_result.new_value).toEqual(null);
            
        });
        
        it('should find make the old value an empty string when it has something new added', function() {
            var description = "KANBANSTATES added [Queued Up]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('KanbanStates', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.original_value).toEqual("");
            expect(parsed_result.new_value).toEqual("Queued Up");
            
        });
        
        it('should find make the new value an empty string when it has something removed', function() {
            var description = "RANK moved down, KANBANSTATES changed from [Develop] to []";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('KanbanStates', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.original_value).toEqual("Develop");
            expect(parsed_result.new_value).toEqual("");
            
        });
    });
});