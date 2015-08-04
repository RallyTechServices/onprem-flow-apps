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
                 expect( time_in_states['Defined'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_saturday,first_sunday,false));
                 expect( time_in_states['Defined'].startDate).toEqual(first_saturday);
                 expect( time_in_states['Defined'].endDate).toEqual(first_sunday);
                 expect( time_in_states['Defined'].lastStartDate).toEqual(first_saturday);

                 expect( time_in_states['In-Progress'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_sunday,first_monday, false));
                 expect( time_in_states['In-Progress'].startDate).toEqual(first_sunday);
                 expect( time_in_states['In-Progress'].endDate).toEqual(first_monday);
                 expect( time_in_states['In-Progress'].lastStartDate).toEqual(first_sunday);

                 expect( time_in_states['Completed'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_monday,first_tuesday, false));
                 expect( time_in_states['Completed'].startDate).toEqual(first_monday);
                 expect( time_in_states['Completed'].endDate).toEqual(first_tuesday);
                 expect( time_in_states['Completed'].lastStartDate).toEqual(first_monday);

                 expect( time_in_states['Accepted'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_tuesday,new Date(), false));
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

                 var time_in_states = Rally.technicalservices.util.Parser.getTimeInStates([rev0,rev1,rev2,rev3,rev4,rev5,rev6],'Schedule State', true);
                 expect( time_in_states['Defined'].timeInState).toEqual(1);
                 expect( time_in_states['Defined'].startDate).toEqual(first_saturday);
                 expect( time_in_states['Defined'].endDate).toEqual(first_tuesday);
                 expect( time_in_states['Defined'].lastStartDate).toEqual(first_monday);

                 expect( time_in_states['Defined'].timeInState).toEqual(
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_saturday,first_sunday, true) +
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_monday,first_tuesday, true)
                    );


                 expect( time_in_states['In-Progress'].timeInState).toEqual(1.21);
                 expect( time_in_states['In-Progress'].startDate).toEqual(first_sunday);
                 expect( time_in_states['In-Progress'].endDate).toEqual(first_wednesday);
                 expect( time_in_states['In-Progress'].lastStartDate).toEqual(first_tuesday);

                 expect( time_in_states['In-Progress'].timeInState).toEqual(
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_sunday, first_monday,true) +
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_tuesday,first_wednesday, true)
                 );

                 expect( time_in_states['Completed'].timeInState).toEqual(1);
                 expect( time_in_states['Completed'].startDate).toEqual(first_wednesday);
                 expect( time_in_states['Completed'].endDate).toEqual(first_thursday);
                 expect( time_in_states['Completed'].lastStartDate).toEqual(first_wednesday);

                 expect( time_in_states['Accepted'].timeInState).toEqual(Rally.technicalservices.util.Utilities.daysBetweenWithFraction(first_thursday,new Date(), true));
                 expect( time_in_states['Accepted'].startDate).toEqual(first_thursday);
                 expect( time_in_states['Accepted'].endDate).toEqual(null);
                 expect( time_in_states['Accepted'].lastStartDate).toEqual(first_thursday);

             });

             it ('should find the cumulative time that each item is in each state with data', function(){

                var rev0_date = new Date(2015,07,7,6,55,17),
                    rev1_date = new Date(2015,07,08,5,0,0),
                    rev2_date = new Date(2015,07,14,7,15,16),
                    rev3_date = new Date(2015,07,15,5,0,0),
                    rev4_date = new Date(2015,07,16,5,0,0),
                    rev5_date = new Date(2015,07,20,7,12,49);


                 var rev0 = Ext.create('mockRevision',{ ObjectID: 1, CreationDate: rev0_date,
                     Description: "Original revision" });
                 var rev1 = Ext.create('mockRevision',{ ObjectID: 2, CreationDate: rev1_date,
                     Description: "NAME changed from [A] to [B]" });
                 var rev2 = Ext.create('mockRevision',{ ObjectID: 3, CreationDate: rev2_date,
                     Description: "RANK moved up, STATE changed from [Initial Infra Requirements] to [Hosting Services], STATE CHANGED DATE changed from [Tue Jul 07 06:55:17 MDT 2015] to [Tue Jul 14 07:15:16 MDT 2015]" });
                 var rev3 = Ext.create('mockRevision',{ ObjectID: 4, CreationDate: rev3_date,
                     Description: "NAME changed from [B] to [C]" });
                 var rev4 = Ext.create('mockRevision',{ ObjectID: 5, CreationDate: rev4_date,
                     Description: "NAME changed from [C] to [D]" });
                 var rev5 = Ext.create('mockRevision',{ ObjectID: 6, CreationDate: rev5_date,
                     Description: "RANK moved down, STATE changed from [Hosting Services] to [Completed], STATE CHANGED DATE changed from [Tue Jul 14 07:15:16 MDT 2015] to [Mon Jul 20 07:12:49 MDT 2015]" });

                 var time_in_states = Rally.technicalservices.util.Parser.getTimeInStates([rev0,rev1,rev2,rev3,rev4,rev5],'State', true);
                 expect( time_in_states['Initial Infra Requirements'].timeInState).toEqual(5.01);
                 expect( time_in_states['Initial Infra Requirements'].startDate).toEqual(rev0_date);
                 expect( time_in_states['Initial Infra Requirements'].endDate).toEqual(rev2_date);
                 expect( time_in_states['Initial Infra Requirements'].lastStartDate).toEqual(rev0_date);
                 expect( time_in_states['Initial Infra Requirements'].timeInState).toEqual(
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(rev0_date,rev2_date, true)
                 );

                 expect( time_in_states['Hosting Services'].timeInState).toEqual(4);
                 expect( time_in_states['Hosting Services'].startDate).toEqual(rev2_date);
                 expect( time_in_states['Hosting Services'].endDate).toEqual(rev5_date);
                 expect( time_in_states['Hosting Services'].lastStartDate).toEqual(rev2_date);

                 expect( time_in_states['Hosting Services'].timeInState).toEqual(
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(rev2_date, rev5_date,true)
                 );

                 expect( time_in_states['Completed'].startDate).toEqual(rev5_date);
                 expect( time_in_states['Completed'].endDate).toEqual(undefined);
                 expect( time_in_states['Completed'].lastStartDate).toEqual(rev5_date);

                 expect( time_in_states['Completed'].timeInState).toEqual(
                     Rally.technicalservices.util.Utilities.daysBetweenWithFraction(rev5_date, new Date(),true)
                 );
             });
         });
    });
});