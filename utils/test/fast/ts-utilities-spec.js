describe("Using the rally utilities",function() {
    var first_saturday_begin = new Date(2013,08,07,0,0,0);
    
    var first_sunday_begin = new Date(2013,08,08,0,0,0);
    var first_sunday_end = new Date(2013,08,08,23,59,0);

    var first_monday_begin = new Date(2013,08,09,0,0,0);
    var first_monday_end = new Date(2013,08,09,23,59,0);
    var first_tuesday_begin = new Date(2013,08,10,0,0,0);
    var first_tuesday_end = new Date(2013,08,10,23,59,0);
    var second_sunday_begin = new Date(2013,08,15,0,0,0);
    var second_monday_begin = new Date(2013,08,16,0,0,0);
    var third_monday_begin = new Date(2013,08,23,0,0,0);
    
    var three_month_start_monday = new Date(2013,10,25,0,0,0);
    var three_month_end_monday = new Date(2014,0,27,0,0,0);

    var thursday_afternoon = new Date(2014,0,23,21,0,0);
    var monday_morning = new Date(2014,0,27,9,0,0);
    var monday_morning_later = new Date(2014,0,27,9,10,0);
    var monday_afternoon = new Date(2014,0,27,21,0,0);
    var tuesday_afternoon = new Date(2014,0,28,21,0,0);

    var saturday_morning = new Date(2013,08,07,6,0,0);
    var sunday_noon = new Date(2013,08,08,12,0,0);
    var next_saturday_night = new Date(2013,08,14,18,0,0);
    var tuesday_noon = new Date(2013,08,10,12,0,0);

    describe("When counting time in fractional days", function(){
        it ('should count the number of days as 0.5 if 12 hours apart on the same day', function(){
            var date1 = monday_morning;
            var date2 = monday_afternoon;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(0.5);
        });
        it ('should count the number of days as 1.5 if 36 hours apart on the same day', function(){
            var date1 = monday_morning;
            var date2 = tuesday_afternoon;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(1.5);
        });
        it ('should return 0.01 days if the duration is less than 0.01 days but greater than 0', function(){
            var date1 = monday_morning;
            var date2 = monday_morning_later;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(0.01);
        });
        it ('should return 0 days if the duration is 0', function(){
            var date1 = monday_morning;
            var date2 = monday_morning;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(0);
        });
        it ('should return 1.5 days if the duration starts thursday afternoon and ends monday_morning and skip weekends = true', function(){
            var date1 = thursday_afternoon;
            var date2 = monday_morning;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(1.5);
        });
        it ('should return 3.5 days if the duration starts thursday afternoon and ends monday_morning and skip weekends = false', function(){
            var date1 = thursday_afternoon;
            var date2 = monday_morning;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,false) ).toEqual(3.5);
        });
        it ('should handle a start date on a saturday as starting monday morning if skip weekends is true', function(){
            var date1 = saturday_morning;
            var date2 = tuesday_noon;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(1.5);

        });
        it ('should handle an end date on a weekend as ending friday night if skip weekends is true', function(){
            var date2 = next_saturday_night;
            var date1 = tuesday_noon;

            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(3.5);
        });
        it ('should handle starting and ending on the same weekend as 0 if skip weekends is true', function(){
            var date2 = sunday_noon;
            var date1 = saturday_morning;
            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(0);
        });
        it ('should handle starting on weekend 1 and ending on weekend 2 as starting monday morning and ending friday night if skip weekends is true', function(){
            var date2 = next_saturday_night;
            var date1 = saturday_morning;
            expect( Rally.technicalservices.util.Utilities.daysBetweenWithFraction(date1,date2,true) ).toEqual(5);
        });

    });


    describe("When counting time",function(){

        it('should count the number of days as 0 if the same time', function() {
            var date1 = first_monday_begin;
            var date2 = first_monday_begin;
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2) ).toEqual(0);

        });
        
        it('should count the number of days as 0 when different times, same day',function() {
            
            // 8th Month is September because Jan is 0
            var date1 = first_monday_begin;
            var date2 = first_monday_end;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2) ).toEqual(0);
        });
        
        it('should count the number of days as 1 on the different days',function() {
            
            var date1 = first_monday_end;
            var date2 = first_tuesday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2) ).toEqual(1);
        });
        
        it('should count the number of days between two dates',function() {
            
            var date1 = first_monday_begin;
            var date2 = first_tuesday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2) ).toEqual(1);
        });
        
        it('should count the number of days between two dates, beginning and end',function() {
            
            var date1 = first_monday_begin;
            var date2 = first_tuesday_end;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2) ).toEqual(1);
        });
        
        it('should not care if the days are supplied out of order',function() {
            
            var date1 = first_monday_begin;
            var date2 = first_tuesday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date2,date1) ).toEqual(1);
        });
        
        it('should count weekends in date difference',function() {
            
            var date1 = first_monday_begin;
            var date2 = second_monday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,false) ).toEqual(7);
        });
        
        it('should not count weekends in date difference when flag set',function() {
            
            var date1 = first_monday_begin;
            var date2 = second_monday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(5);
        });
        
        it('should not count weekends in date difference across two weekends when flag set',function() {
            
            var date1 = first_monday_begin;
            var date2 = third_monday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(10);
        });  
        
        it('should return 0 when on a Saturday and not counting weekends in date difference',function() {
            
            var date1 = first_saturday_begin;
            var date2 = first_sunday_end;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(0);
        });
        
        it('should shift beginning Saturday to Monday if not counting weekends in difference',function() {
            var date1 = first_saturday_begin;
            var date2 = first_tuesday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(1);
        });
        
        it('should shift beginning Sunday to Monday if not counting weekends in difference',function() {
            var date1 = first_sunday_begin;
            var date2 = first_tuesday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(1);
        });
        
        it('should shift ending Sunday to Monday if not counting weekends in difference',function() {
            var date1 = first_tuesday_begin;
            var date2 = second_sunday_begin;
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(4);
        });
        
    });
    describe("When getting an array of days",function(){
        it('should return an array of days without weekends', function(){
            var date1 = first_saturday_begin;
            var date2 = third_monday_begin;
            var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(date1,date2,true);
            expect( array_of_days.length ).toEqual(11);
            expect( array_of_days[0] ).toEqual(first_monday_begin);
            expect( array_of_days[10] ).toEqual(third_monday_begin);
            
        });
        
        it('should return an array of days with weekends', function(){
            var date1 = first_saturday_begin;
            var date2 = third_monday_begin;
            var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(date1,date2,false);
            
            expect( array_of_days.length ).toEqual(17);
            expect( array_of_days[0] ).toEqual(first_saturday_begin);
            expect( array_of_days[16] ).toEqual(third_monday_begin);
            
        });
        
        it('should return an array of days even if dates are in wrong order', function(){
            var date1 = first_saturday_begin;
            var date2 = third_monday_begin;
            
            var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(date2,date1,true);
            expect( array_of_days.length ).toEqual(11);
            expect( array_of_days[0] ).toEqual(first_monday_begin);
            expect( array_of_days[10] ).toEqual(third_monday_begin);
            
        });
        
        it('should return an array of days spaced a week apart when there are more than 45 days',function(){
            var date1 = three_month_start_monday;
            var date2 = three_month_end_monday;
            
            var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(date1,date2,true,40);
            
            expect( Rally.technicalservices.util.Utilities.daysBetween(date1,date2,true) ).toEqual(45);
            expect(array_of_days.length).toEqual(10);
            expect(array_of_days[0]).toEqual(date1);
            expect(array_of_days[9]).toEqual(date2);
            
        });
        
        it('should return an array of 30 minute increments when less than or equal to 2 days', function(){
            var date1 = new Date(2013,08,09,0,0,0);
            var date2 = new Date(2013,08,09,23,59,0);
            
            var expected_last_timestamp = new Date(2013,08,09,23,30,0);
            var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(date1,date2,true);
            expect( array_of_days.length ).toEqual(48);
            expect( array_of_days[0] ).toEqual(date1);
            expect( array_of_days[47] ).toEqual(expected_last_timestamp);
            
        });
    });
});
