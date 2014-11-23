describe("Given arrays of revisions",function() {
   var first_saturday_begin = new Date(2013,08,07,0,0,0);
    
    var first_sunday_end = new Date(2013,08,08,23,59,0);

    var first_monday_begin = new Date(2013,08,09,0,0,0);
    var first_monday_end = new Date(2013,08,09,23,59,0);
    var first_tuesday_begin = new Date(2013,08,10,0,0,0);
    var first_tuesday_end = new Date(2013,08,10,23,59,0);
    var second_monday_begin = new Date(2013,08,16,0,0,0);
    var third_monday_begin = new Date(2013,08,23,0,0,0);
    
    var three_month_start_monday = new Date(2013,10,25,0,0,0);
    var three_month_end_monday = new Date(2014,0,27,0,0,0);
    
    describe("When searching start values for a field",function(){  
        it('should find the revisions that entered two states', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
        
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2,rev3], 'Schedule State', 'In-Progress', 'Accepted');
            expect( found_revisions.length ).toEqual(2);
            expect( found_revisions[0].get('ObjectID') ).toEqual(1);
            expect( found_revisions[1].get('ObjectID') ).toEqual(3);
            
        });
        
        it('should return empty array if only the start state is found', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
        
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2,rev3], 'Schedule State', 'In-Progress', 'FRED');
            expect( found_revisions.length ).toEqual(0);
            
        });
        
        it('should return empty array if only the end state is found', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
        
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2,rev3], 'Schedule State', 'FRED', 'Accepted');
            expect( found_revisions.length ).toEqual(0);
            
        });
        
        it('should return empty array if neither state is found', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
        
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2,rev3], 'Schedule State', 'FRED', 'ETHEL');
            expect( found_revisions.length ).toEqual(0);
            
        });
        
        it('should return very first start state and very last end state if it enters those states multiple times', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [In-Progress]" });
            var rev4 = Ext.create('mockRevision',{ ObjectID: 4, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Completed]" });
        
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2,rev3,rev4], 'Schedule State', 'In-Progress', 'Completed');
            expect( found_revisions.length ).toEqual(2);
            expect( found_revisions[0].get('ObjectID') ).toEqual(1);
            expect( found_revisions[1].get('ObjectID') ).toEqual(4);
        });
        
        it('should return very first start state and very last end state if it enters the end state multiple times', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "RANK moved up, SCHEDULE STATE changed from [Defined] to [In-Progress]" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [In-Progress] to [Accepted]" });
            var rev3 = Ext.create('mockRevision',{ ObjectID: 3, Description: "RANK moved down, SCHEDULE STATE changed from [Accepted] to [Completed]" });
            var rev4 = Ext.create('mockRevision',{ ObjectID: 4, Description: "RANK moved down, SCHEDULE STATE changed from [Completed] to [Accepted]" });
        
            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2,rev3,rev4], 'Schedule State', 'In-Progress', 'Accepted');
            expect( found_revisions.length ).toEqual(2);
            expect( found_revisions[0].get('ObjectID') ).toEqual(1);
            expect( found_revisions[1].get('ObjectID') ).toEqual(4);
        });
        
        it('should assume the creation state is the initial one if provided in the time frame', function() {
            var rev1 = Ext.create('mockRevision',{ ObjectID: 1, Description: "Original revision" });
            var rev2 = Ext.create('mockRevision',{ ObjectID: 2, Description: "RANK moved down, SCHEDULE STATE changed from [Defined] to [Accepted]" });

            var found_revisions = Rally.technicalservices.util.Parser.findEntryExitRevisions([rev1,rev2], 'Schedule State', 'Defined', 'Accepted');
            expect( found_revisions.length ).toEqual(2);
            expect( found_revisions[0].get('ObjectID') ).toEqual(1);
            expect( found_revisions[1].get('ObjectID') ).toEqual(2);
        });
    });
});