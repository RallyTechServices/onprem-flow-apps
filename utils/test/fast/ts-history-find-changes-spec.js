describe("Given arrays of revisions",function() {
    var first_saturday = new Date(2013,08,07,5,0,0);
    var first_sunday = new Date(2013,08,08,5,0,0);
    var first_monday = new Date(2013,08,09,5,0,0);
    var first_tuesday = new Date(2013,08,10,5,0,0);
    var first_wednesday = new Date(2013,08,11,5,0,0);
    var first_thursday = new Date(2013,08,12,5,0,0);
    var first_friday = new Date(2013,08,13,5,0,0);
    
    var second_saturday = new Date(2013,08,13,5,0,0);
    var second_sunday = new Date(2013,08,14,5,0,0);
    var second_monday = new Date(2013,08,15,5,0,0);
    var second_tuesday = new Date(2013,08,16,5,0,0);
    var second_wednesday = new Date(2013,08,17,5,0,0);
    var second_thursday = new Date(2013,08,18,5,0,0);
    var second_friday = new Date(2013,08,19,5,0,0);

    describe("When searching all changes to a field",function(){  
        it('should find the state changes in an array', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, CreationDate: first_saturday, 
                Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, CreationDate: first_sunday, 
                Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, CreationDate: first_monday, 
                Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
            var rev4 = Ext.create('mockRevision',{ ObjectID: 4, CreationDate: first_tuesday, 
                Description: "RANK moved up" });
            var states = Rally.technicalservices.util.Parser.getStateAttainments([rev1,rev2,rev3,rev4], 'Schedule State');
            expect( states.length ).toEqual(3);
            expect( states[0] ).toEqual({ state: 'In-Progress', change_date: first_saturday});
            expect( states[1] ).toEqual({ state: 'Completed', change_date: first_sunday});
            expect( states[2] ).toEqual({ state: 'Accepted', change_date: first_monday});
            
        });
        
        it('should determine the initial state if creation revision is provided', function() {
            var rev0 = Ext.create('mockRevision',{ ObjectID: 1, CreationDate: first_saturday,
                Description: "Original revision" });
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, CreationDate: first_sunday, 
                Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, CreationDate: first_monday, 
                Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, CreationDate: first_tuesday, 
                Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
            var rev4 = Ext.create('mockRevision',{ ObjectID: 4, CreationDate: first_wednesday, 
                Description: "RANK moved up" });
            var states = Rally.technicalservices.util.Parser.getStateAttainments([rev0,rev1,rev2,rev3,rev4], 'Schedule State');
            expect( states.length ).toEqual(4);
            expect( states[0] ).toEqual({ state: 'Defined', change_date: first_saturday});
            expect( states[1] ).toEqual({ state: 'In-Progress', change_date: first_sunday});
            expect( states[2] ).toEqual({ state: 'Completed', change_date: first_monday});
            expect( states[3] ).toEqual({ state: 'Accepted', change_date: first_tuesday});
            
        });

         describe("When given a set of state changes,",function(){
            it('should get an item in each state every day', function() {

                var item1 = Ext.create('mockStory', { ObjectID: 1, Name: 'item 1', PlanEstimate: 5 });
                
                item1.set("_changes", [
                    { state: 'Defined', change_date: first_sunday},
                    { state: 'In-Progress', change_date: first_tuesday},
                    { state: 'Accepted', change_date: first_thursday}
                ] );
        
                
                var cumulative_flow = Rally.technicalservices.util.Parser.getCumulativeFlow([item1], first_saturday, first_friday);
                expect( cumulative_flow[first_saturday] ).toEqual({});
                expect( cumulative_flow[first_sunday] ).toEqual({ 'Defined': [item1] });
                expect( cumulative_flow[first_monday] ).toEqual({ 'Defined': [item1] });
                expect( cumulative_flow[first_tuesday] ).toEqual({ 'In-Progress': [item1] });
                expect( cumulative_flow[first_wednesday] ).toEqual({ 'In-Progress': [item1] });
                expect( cumulative_flow[first_thursday] ).toEqual({ 'Accepted': [item1] });
                expect( cumulative_flow[first_friday] ).toEqual({ 'Accepted': [item1] });
                
             });
             
             it('should get an item in each state every day when there are multiple changes on one day', function() {

                var item1 = Ext.create('mockStory', { ObjectID: 1, Name: 'item 1', PlanEstimate: 5 });
                
                item1.set("_changes", [
                    { state: 'Defined', change_date: Rally.util.DateTime.add(first_saturday,'minute',5)},
                    { state: 'In-Progress', change_date: Rally.util.DateTime.add(first_saturday,'minute',10)},
                    { state: 'Accepted', change_date: Rally.util.DateTime.add(first_saturday,'minute',20)}
                ] );
                        
                var cumulative_flow = Rally.technicalservices.util.Parser.getCumulativeFlow([item1], first_saturday, first_friday);
                expect( cumulative_flow[first_saturday] ).toEqual({});
                expect( cumulative_flow[first_sunday] ).toEqual({ 'Accepted': [item1] });
                expect( cumulative_flow[first_monday] ).toEqual({ 'Accepted': [item1] });
             });
             
             it('should get the items in each state every day when multiple items are provided', function() {

                var item1 = Ext.create('mockStory', { ObjectID: 1, Name: 'item 1', PlanEstimate: 5 });
                var item2 = Ext.create('mockStory', { ObjectID: 2, Name: 'item 2', PlanEstimate: 5 });
                var item3 = Ext.create('mockStory', { ObjectID: 3, Name: 'item 3', PlanEstimate: 5 });
                
                item1.set("_changes", [
                    { state: 'Defined', change_date: first_sunday},
                    { state: 'In-Progress', change_date: first_tuesday},
                    { state: 'Accepted', change_date: first_thursday}
                ] );
                item2.set("_changes", [
                    { state: 'Defined', change_date: first_monday},
                    { state: 'In-Progress', change_date: first_wednesday}
                ] );        
                item3.set("_changes", [
                    { state: 'Defined', change_date: first_thursday}
                ] );
                var cumulative_flow = Rally.technicalservices.util.Parser.getCumulativeFlow([item1,item2,item3], first_saturday, first_friday);
                expect( cumulative_flow[first_saturday] ).toEqual({});
                expect( cumulative_flow[first_sunday] ).toEqual({ 'Defined': [item1] });
                expect( cumulative_flow[first_monday] ).toEqual({ 'Defined': [item1,item2] });
                expect( cumulative_flow[first_tuesday] ).toEqual({ 'Defined': [item2], 'In-Progress': [item1] });
                expect( cumulative_flow[first_wednesday] ).toEqual({ 'In-Progress': [item1,item2] });
                expect( cumulative_flow[first_thursday] ).toEqual({ 'Defined': [item3], 'In-Progress': [item2],'Accepted': [item1] });
                expect( cumulative_flow[first_friday] ).toEqual({ 'Defined': [item3], 'In-Progress': [item2],'Accepted': [item1] });
                
             });


             /*
              * Given an array of revisions and a field name that holds the state,
              * find all the state transitions and return a hash of objects that contain the following:
              * key:  StateValue
              * values: TimeInState, StartDate, EndDate
              */
             it ('should find the time that each item is in each state', function(){
                 var rev0 = Ext.create('mockRevision',{ ObjectID: 1, CreationDate: first_saturday,
                     Description: "Original revision" });
                 var rev1 = Ext.create('mockRevision',{ ObjectID: 2, CreationDate: first_sunday,
                     Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
                 var rev2 = Ext.create('mockRevision',{ ObjectID: 3, CreationDate: first_monday,
                     Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
                 var rev3 = Ext.create('mockRevision',{ ObjectID: 4, CreationDate: first_tuesday,
                     Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
                 var rev4 = Ext.create('mockRevision',{ ObjectID: 5, CreationDate: first_wednesday,
                     Description: "RANK moved up" });

                 var time_in_states = Rally.technicalservices.util.Parser.getTimeInStates([rev0,rev1,rev2,rev3,rev4],'Schedule State');
                 expect( time_in_states['Defined'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetween(first_sunday, first_saturday,false));
                 expect( time_in_states['Defined'].startDate).toEqual(first_saturday);
                 expect( time_in_states['Defined'].endDate).toEqual(first_sunday);
                 expect( time_in_states['Defined'].lastStartDate).toEqual(first_saturday);

                 expect( time_in_states['In-Progress'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetween(first_monday, first_sunday,false));
                 expect( time_in_states['In-Progress'].startDate).toEqual(first_sunday);
                 expect( time_in_states['In-Progress'].endDate).toEqual(first_monday);
                 expect( time_in_states['In-Progress'].lastStartDate).toEqual(first_sunday);

                 expect( time_in_states['Completed'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetween(first_tuesday, first_monday,false));
                 expect( time_in_states['Completed'].startDate).toEqual(first_monday);
                 expect( time_in_states['Completed'].endDate).toEqual(first_tuesday);
                 expect( time_in_states['Completed'].lastStartDate).toEqual(first_monday);

                 expect( time_in_states['Accepted'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetween(new Date(), first_tuesday,false));
                 expect( time_in_states['Accepted'].startDate).toEqual(first_tuesday);
                 expect( time_in_states['Accepted'].endDate).toEqual(null);
                 expect( time_in_states['Accepted'].lastStartDate).toEqual(first_tuesday);

             });

             it ('should find the cumulative time that each item is in each state', function(){
                 var rev0 = Ext.create('mockRevision',{ ObjectID: 1, CreationDate: first_saturday,
                     Description: "Original revision" });
                 var rev1 = Ext.create('mockRevision',{ ObjectID: 2, CreationDate: first_sunday,
                     Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
                 var rev2 = Ext.create('mockRevision',{ ObjectID: 3, CreationDate: first_monday,
                     Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Defined]" });
                 var rev3 = Ext.create('mockRevision',{ ObjectID: 4, CreationDate: first_tuesday,
                     Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
                 var rev4 = Ext.create('mockRevision',{ ObjectID: 5, CreationDate: first_wednesday,
                     Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
                 var rev5 = Ext.create('mockRevision',{ ObjectID: 6, CreationDate: first_thursday,
                     Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
                 var rev6 = Ext.create('mockRevision',{ ObjectID: 7, CreationDate: first_friday,
                     Description: "RANK moved up" });

                 var time_in_states = Rally.technicalservices.util.Parser.getTimeInStates([rev0,rev1,rev2,rev3,rev4,rev5,rev6],'Schedule State');
                 expect( time_in_states['Defined'].timeInState).toEqual(2);
                 expect( time_in_states['Defined'].startDate).toEqual(first_saturday);
                 expect( time_in_states['Defined'].endDate).toEqual(first_tuesday);
                 expect( time_in_states['Defined'].lastStartDate).toEqual(first_monday);

                 expect( time_in_states['In-Progress'].timeInState).toEqual(2);
                 expect( time_in_states['In-Progress'].startDate).toEqual(first_sunday);
                 expect( time_in_states['In-Progress'].endDate).toEqual(first_wednesday);
                 expect( time_in_states['In-Progress'].lastStartDate).toEqual(first_tuesday);

                 expect( time_in_states['Completed'].timeInState).toEqual(1);
                 expect( time_in_states['Completed'].startDate).toEqual(first_wednesday);
                 expect( time_in_states['Completed'].endDate).toEqual(first_thursday);
                 expect( time_in_states['Completed'].lastStartDate).toEqual(first_wednesday);

                 expect( time_in_states['Accepted'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetween(new Date(), first_thursday,false));
                 expect( time_in_states['Accepted'].startDate).toEqual(first_thursday);
                 expect( time_in_states['Accepted'].endDate).toEqual(null);
                 expect( time_in_states['Accepted'].lastStartDate).toEqual(first_thursday);

             });

         });
    });
});