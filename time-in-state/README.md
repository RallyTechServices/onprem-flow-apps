#Time in State

<div>Bare bones Time-in-State App that parses Revision History to get state transitions and durations and displays them in a grid with exportable. &nbsp;Configurable model types (Portfolio Items or Stories), State field and Display fields. &nbsp;</div>

![ScreenShot](/images/time-in-state.png)

Use the App Settings to configure the Artifact Type, display fields (in addition to Total Time In State, Duration and Start and End for each selected state).

Total Days:  This represents the total number of days from the FIRST day the item transitioned into the selected Start State until the FIRST Time that the item transitions into the end state.  

For each State between the selected Start State and End States:
<State>: Total cumulative duration (in fractions of a day) the item was in that state.  
Start:  The first time that the item entered the <State>
End: The last time that the item left the <State>

If there is no End, then the item is likely still in that state.  

Notes:
The app skips weekends and will behave as follows if an item is transitioned in or out of a state on a weekend:
*  If an item is transitioned into a state on saturday morning, and transitioned out of the state on sunday, the duration for that will be 0.  
*  If an item is transitioned into a state on saturday and transitioned out of the state on tuesday at noon, the duration will be calculated from Monday morning at Midnight, so the duration would be 1.5 days.   
*  If an item is put into a state on Thursday at noon and transitioned out of the state on Sunday, the duration will be calculated from Thursday to Friday at midnight (1.5 days).  
*  Finally, if an item is transitioned into a state on a Saturday morning and transitioned out of that state the following Sunday night, the duration will be calculated from midnight on Monday to midnight on friday, and will be 5 days.  


Durations are calculated in a fraction of a day (up to 2 decimal places).  If an item has a duration greater than 0 but less than 0.01, the duration will show up as 0.01.  

This app parses the revision history after the grid is loaded.  If this app is scoped to a parent project with several artifacts, the app may seem sluggish and performance may be slow during exporting.    