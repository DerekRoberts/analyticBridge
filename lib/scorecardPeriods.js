// Strict mode
"use strict";

var moment = require('moment');
var util = require(__dirname + '/' + 'util.js');

var fs = require('fs');
var scorecardPeriodsFile = JSON.parse(fs
        .readFileSync('./config/scorecardPeriods.json'));

/**
 * Return a list of time periods for which to generate scorecards
 * 
 * @returns {array} Array of scorcard time period objects
 */
var getScorecardPeriods = function() {
	// Build array of periods based on settings
	var periods = [];

	var entry;
	var start;
	var end;
	for (var ctr = 0; ctr < scorecardPeriodsFile.length; ctr++) {
		entry = scorecardPeriodsFile[ctr];

		if ((typeof entry.end === "string")
		        && (entry.end.toLowerCase() === "now")) {
			// Set end date to current date
			end = moment(0, "HH");
		} else {
			// Use specified end date
			end = moment(entry.end);
		}

		// determine start date
		if(entry.start) {
			// We have a set start date
			start = moment(entry.start);	
		} else if(entry.length) {
			// We have a set length of time 
			// Count back from end date
			start = moment(end).subtract(moment.duration(entry.length));
		} else {
			// No start value specified
			start = null;
		}
		
		if (entry.interval) {
			// We have a settings entry that defines a set of periods
			// based on an interval. Expand into individual periods.
			
			var interval;
			// Check for special case of quarters that is not supported by moment.js
			if(entry.interval.quarters) {
				// Convert to months
				interval = moment.duration(entry.interval.quarters * 3, 'months');

				// Adjust start date to the start of the proper calendar quarter within which it currently falls
				start.subtract(start.month() % 3, 'months' );
				start.date(1);
			} else {
				// Parse as a moment.js interval
				interval = moment.duration(entry.interval);
			}
			

			// Build period list
			var period;
			var current = start;
			while (current.isBefore(end)) {
				period = {};
				period.start = moment(current);
				current.add(interval);
				if (current.isAfter(end)) {
					// We have a partial interval at the end of the range
					period.end = moment(end);
					
					// Do not include partial intervals in results
				} else {
					// we have a full interval.
					// it ends the day before the start of the next interval
					period.end = moment(current).subtract(1, "day");
					
					// Add full interval to results
					periods.push(period);
				}
			}
		} else {
			// entry is a single period entry
			var period = {};
			period.start = moment(entry.start);
			period.end = end;
			periods.push(period);
		}
	}

	return periods;
};

module.exports = {
	getScorecardPeriods : getScorecardPeriods
};
