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

		if (entry.interval) {
			// We have a settings entry that defines a set of periods
			// based on an interval. Expand into individual periods.
			var interval = moment.duration(entry.interval);
			var period;
			var current = moment(entry.start);
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
