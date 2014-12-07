describe("Given description strings for workspace revisions",function() {

    
    describe("When searching change values for a project",function(){  
        it('should find the old and new values for a given field', function() {
            var description = "PROJECTS added [DogDogDog01]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('projects', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.new_value).toEqual("DogDogDog01");
            expect(parsed_result.original_value).toEqual("");
            
        });
        
        it('should find the old and new values for a given project in format 2', function() {
            var description = "Shared Custom Page [DogApp] shared with 1 new projects, PROJECTS added [DogDogDog02.b]";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('projects', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.new_value).toEqual("DogDogDog02.b");
            expect(parsed_result.original_value).toEqual("");
            
        });
        
        
        it('should find the old and new values for a given project in format 1', function() {
            var description = "Added project Project 3";
            var parsed_result = Rally.technicalservices.util.Parser.findValuesForField('projects', description);
            
            expect(parsed_result.description).toEqual(description);
            expect(parsed_result.new_value).toEqual("Project 3");
            expect(parsed_result.original_value).toEqual("");
            
        });
    });
});

