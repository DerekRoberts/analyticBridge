// Strict mode
"use strict";


// Requires for date formatting, file system, UUIDs, JSON-XML and SCP
var moment = require('moment');
var fs  = require('fs');
var nodeUUID = require( 'node-uuid' );
var js2xmlparser = require('js2xmlparser');
var scpClient = require('scp2');

// Requires for reading the query list and SCP settings
var queries      = require('./queries.js');
var doctors = require( __dirname + '/../lib/' + 'doctors.js' );
var util = require( __dirname + '/util.js');

/**
 * Creates and returns an AMCARE scorecard
 * 
 * @param scorecardTemplate
 *                {object} scorecardTemplate JSON scorecard template from which
 *                to start
 * @param doctor
 *                {string} doctor CPS Id of doctor for which to create the
 *                scorecard
 * @param period
 *                {object} period Time period containing start and end moments
 *                for scorecard
 * @param data
 *                {object} data Full set of data from which to pull values for
 *                scorecard
 * @returns {object} Created AMCARE scorecard object, or null if a scorecard
 *          could not be created for the values passed
 */
function createScorecard(scorecardTemplate, doctor, period, data) {
    // start from fresh copy of template
    var scorecard = JSON.parse(JSON.stringify(scorecardTemplate));
    
    var headerSuccess = populateScorecardHeader(scorecard.ScoreCardHeader, doctor, period, data);
    var ratioSuccess = populateRatioQueries(scorecard.ReportingCategories, doctor, period, data);
    var patientCountsSuccess = populateTenYearRanges(scorecard.PatientCounts, "PatientCounts", doctor, period, data);
    var contactCountsSuccess = populateTenYearRanges(scorecard.ContactCounts, "ContactCounts", doctor, period, data);
    
    if(headerSuccess && patientCountsSuccess && contactCountsSuccess) {
	// A valid header, a populated patient counts, 
	// and a populated contact counts is all that is necessary for success
	return scorecard;
    } else {
	// Without a valid header, a populated patient counts, and a populated contact counts
	// a valid scorecard cannot be created
	return null;
    }
    
}

/**
 * Populates the object passed with header section information for a scorecard.
 * 
 * @param toPopulate
 *                {object} Object to populate with header fields
 * @param doctor
 *                {string} doctor CPS Id of doctor for which to create the
 *                scorecard
 * @param period
 *                {object} period Time period containing start and end moments
 *                for scorecard
 * @param data
 *                {object} data Full set of data from which to pull values for
 *                scorecard
 * @returns {boolean} whether the object was successfully populated with data
 */
function populateScorecardHeader(toPopulate, doctor, period, data) {
    var docInfo = doctors.getDoctorInfo(doctor);

    // Fill in the header information
    toPopulate['UniqueScoreCardIdentifier'] = nodeUUID.v4();
    toPopulate['ScoreCardMode']['SinglePhysicianPracticeSubsetScoreCard']['ReportingPhysicianMSPNumber'] 
    	= docInfo.msp;
    toPopulate['ScoreCardMode']['SinglePhysicianPracticeSubsetScoreCard']['PracticeAndPhysicianDetails']
    	['PracticeInformation']['UniquePracticeIdentifier'] = docInfo.clinic;

    // Use end of time period for data date as scorecard could include data up
    // to this date
    toPopulate['ScoreCardDataDateTime'] = formatMomentScorecard(period.end);

    // Current time, for ScoreCardGenerationDateTime
    toPopulate['ScoreCardGenerationDateTime'] = formatMomentScorecard(moment());
    
    // Currently there is no case that would not be an error that would lead to being unable 
    // to populate the header
    return true;
}

/**
 * Helper function to test whether the object passed has properties for all of
 * the possible agesMin values for ten year ranges queries.
 * 
 * @param object
 *                {object} Object to examine
 * @returns {boolean} Whether the object passed has properties for all of the
 *          possible agesMin values for ten year ranges queries.
 */
function hasAllTenYearRanges(object) {
    return (object.hasOwnProperty("ZeroToNine")
	    && object.hasOwnProperty("TenToNineteen")
	    && object.hasOwnProperty("TwentyToTwentyNine")
	    && object.hasOwnProperty("ThirtyToThirtyNine")
	    && object.hasOwnProperty("FortyToFortyNine")
	    && object.hasOwnProperty("FiftyToFiftyNine")
	    && object.hasOwnProperty("SixtyToSixtyNine")
	    && object.hasOwnProperty("SeventyToSeventyNine")
	    && object.hasOwnProperty("EightyToEightyNine")
	    && object.hasOwnProperty("NinetyToOneHundredAndOlder")
	    && object.hasOwnProperty("UnspecifiedAge")
    );
}

/**
 * Extracts and returns result for the query, doctor and time period passed from
 * the data passed. Data is taken from the query result that occurs last within
 * the time period passed. If no result is available, null is returned.
 * 
 * @param queryTitle
 *                {string} Title of query for which to return results
 * @param type
 *                {string} The value for the query type to extract the data from
 *                One of "Ratio" or "TenYearRanges"
 * @param doctorPID
 *                {string} doctor PID hash to match when extracting data
 * @param period
 *                {object} period Time period containing start and end moments
 *                for scorecard
 * @param data
 *                {object} data Full set of data from which to pull values for
 *                scorecard
 * @returns {object} Object containing the result to use for the doctor and
 *          period passed, or null if no result found
 */
function extractResult(queryTitle, type, doctorPID, period, data) {
    if(!((type === "Ratio") || (type === "TenYearRanges"))) {
	throw "Invalid value for type of \"" + type + "\" passed to extractResult";
    }
    
    var timingStart;
    
    
    // Scan through results, searching for last result within the time period
    // within the last execution
    if(data[queryTitle]) {
	// There is results for the query that we are searching for
	
	var queryInfo = queries.getQueryInfo(queryTitle);
	
	// Executions are probably already in ascending order by time.
	// Build new array and sort to ensure this is the case.
	// This is done in a local copy of the array as the data object MUST NOT be modified 
	// as it is being accessed by multiple threads.
	// An obvious performance enhancement would be to do this once in advance
	timingStart = moment();
	var executions = data[queryTitle].slice();
	executions.sort(function(a, b) {
	    return a.time - b.time;
		});
        // Record possible execution time savings
	addToTotalSortTime(timingStart);

	var resultsMap;
	var resultsList;
	var resultDataDate;
	var previousResult;
	var chosenResult;
	var resultKeyObject
	// Iterate through executions in reverse order until we find our chosen result.
	// If we find a result within the time period in a more recent execution, do
	// not use results from older executions.
	for(var executionCtr = executions.length -1; !chosenResult && executionCtr >= 0; executionCtr-- )
	{
		// Make sure the execution contains results
		if(typeof executions[executionCtr].aggregate_result == 'object') { 
		    // Build map from dataDate to numerator denominator pairs for doctor
		    // within the time period
		    // as numerators or denominators could be missing
		    resultsMap = {}; 
		    Object.keys(executions[executionCtr].aggregate_result).forEach(function (resultKey) {
			resultKeyObject = JSON.parse(resultKey);
			    
			if(resultKeyObject.date) {
			    // Result has a date value specified
			    
			    // Get data date
			    resultDataDate = moment(parseInt(resultKeyObject.date));
			    
			    // Test if data date is within test period.
			    // Data date is between the start and end of the period,
			    // with granularity
			    // by day inclusive of both start and end
			    if(resultDataDate.isBetween(period.start, period.end, "day", "[]")) {
				if(resultKeyObject.doctor == doctorPID) {
				    // Result is for the correct doctor
				    
	            		    if((resultKeyObject.type == "Ratio") && (resultKeyObject.type == type )) {
	              		        // We have a ratio query and that is what we are looking for 
	            			// Check for previous result
	            			previousResult = resultsMap[resultDataDate.valueOf()];
	    			    
	            			if(!previousResult) {
	            			    // This is a new result
	            			    // Save data date into object for later sorting of values
	            			    previousResult = {
	            				date : resultDataDate.valueOf()
	            			    };
	            			}
	    
	            			if(resultKeyObject.result == "denominator") {
	    				    // We have a denominator result
	    				    if(previousResult.hasOwnProperty("denominator")) {
	    					// This is a second denominator found
	    					// for the same execution.
	    					throw "Encountered a second denominator result for Query = " 
	    					+ queryTitle + " in execution Timestamp = " 
	    					+ executions[executionCtr].time 
	    					+ " Doctor = " + resultKeyObject.doctor
	    					+ " Data Date = " + resultKeyObject.date;
	    				    } else {
	    					// Save to result
	    					previousResult.denominator = executions[executionCtr].aggregate_result[resultKey];
	    					// Save to map
	    					resultsMap[resultDataDate.valueOf()] = previousResult;
	    				    }
	            			}
	            			if(resultKeyObject.result == "numerator") {
	            			    // We have a denominator result
	            			    if(previousResult.hasOwnProperty("numerator")) {
	            				// This is a second denominator found
	            				// for the same execution.
	            				throw "Encountered a second numerator result for Query = " 
	            				+ queryTitle + " in execution Timestamp = " 
	            				+ executions[executionCtr].time 
	            				+ " Doctor = " + resultKeyObject.doctor
	            				+ " Data Date = " + resultKeyObject.date;
	            			    } else {
	            				// Save to result
	            				previousResult.numerator = executions[executionCtr].aggregate_result[resultKey];
	            				// Save to map
	    
	            				resultsMap[resultDataDate.valueOf()] = previousResult;
	            			    }
	            			}
	            		    } else if((resultKeyObject.type == "TenYearRanges") && (resultKeyObject.type == type )) {
	            			// We have a TenYearRanges query and that is what we are looking for
	            			// Check for previous result
	            			previousResult = resultsMap[resultDataDate.valueOf()];
	    			    
	            			if(!previousResult) {
	            			    // This is a new result
	            			    // Save data date into object for later sorting of values
	            			    previousResult = {
	            				date : resultDataDate.valueOf()
	            			    };
	            			}
	    
	            			// Create gender subobject if required
	            			if(!previousResult[queryInfo.genderMap[resultKeyObject.gender]] 
	            				&& ((resultKeyObject.gender == "Male")
	            					|| (resultKeyObject.gender == "Female")
	            					|| (resultKeyObject.gender == "Unspecified"))) {
	            			    previousResult[queryInfo.genderMap[resultKeyObject.gender]] = {};
	            			}
	            			
	            			// Add to age category under gender if not yet specified
	            			if(previousResult[queryInfo.genderMap[resultKeyObject.gender]]
	            				.hasOwnProperty(queryInfo.ageMap[resultKeyObject.agesMin])) {
						// This is a second value for the age range and gender found
						// for the same execution.
						throw "Encountered a second result for Query = " 
						+ queryTitle + " Gender = " + resultKeyObject.gender
						+ " which maps to " + queryInfo.genderMap[resultKeyObject.gender]
						+ " agesMin = " + resultKeyObject.agesMin
						+ " which maps to " + queryInfo.ageMap[resultKeyObject.agesMin]
						+ " in execution Timestamp = " + executions[executionCtr].time 
						+ " Doctor = " + resultKeyObject.doctor
						+ " Data Date = " + resultKeyObject.date;
					} else {
					    // Save to result
					    previousResult[queryInfo.genderMap[resultKeyObject.gender]]
					    	[queryInfo.ageMap[resultKeyObject.agesMin]] 
						= executions[executionCtr].aggregate_result[resultKey];
					    // Save to map
					    resultsMap[resultDataDate.valueOf()] = previousResult;
					}
	            		    }
	            		}
			    }
			}
			    
		    });
	}
	    
	    // Build list of results for this execution, sorted by date in descending order

	    // Time for this operation could be reduced if the results were presorted 
	    timingStart = moment();

	    resultsList = [];
	    Object.keys(resultsMap).forEach(function(key) {
		resultsList.push(resultsMap[key]);
	    });
	    resultsList.sort(function(a, b) {
		    return b.date - a.date;
		});
	    
	    // Choose most recent result with all subparts present
	    for(var resultCtr = 0; !chosenResult && resultCtr < resultsList.length; resultCtr++) {
		if(type == "Ratio") {
		    if(resultsList[resultCtr].hasOwnProperty("numerator") 
    			&& resultsList[resultCtr].hasOwnProperty("denominator")) {
			// We have our result.
			chosenResult = resultsList[resultCtr];
    
			// Setting chosenResult will end execution loop
		    }
		} else if(type == "TenYearRanges") {
		    if(resultsList[resultCtr].hasOwnProperty("Male")
			&& hasAllTenYearRanges(resultsList[resultCtr].Male)
    			&& resultsList[resultCtr].hasOwnProperty("Female")
			&& hasAllTenYearRanges(resultsList[resultCtr].Female)
    			&& resultsList[resultCtr].hasOwnProperty("Unspecified")
			&& hasAllTenYearRanges(resultsList[resultCtr].Unspecified)) {
			// We have our result.
			chosenResult = resultsList[resultCtr];
    
			// Setting chosenResult will end execution loop
		    }

		}
		
	    }
	    
	    // Record possible execution time savings
	    addToTotalSortTime(timingStart);
	}
	    
	if(chosenResult) {
	    // We have a result
	    
	    // Debugging: Enable this output for examining source data
//	    console.log("Result for " + queryTitle + " for " + period.start.format() 
//		    + " to " + period.end.format() + " is " + moment(chosenResult.date).format());
//	    util.pp(chosenResult);
	    
	    return chosenResult;
	} else {
	    // No matching results found
	    return null;
	}
	
    } else {
	// There are no results for the query that we are searching for
	return null;
    }
   
}

/**
 * Populates the object passed with ratio query results for a scorecard.
 * 
 * @param toPopulate
 *                {object} Object to populate with ratio query tags
 * @param doctor
 *                {string} doctor CPS Id of doctor for which to create the
 *                scorecard
 * @param period
 *                {object} period Time period containing start and end moments
 *                for scorecard
 * @param data
 *                {object} data Full set of data from which to pull values for
 *                scorecard
 * @returns {Boolean} whether the object was successfully populated with at
 *          least one result
 * 
 */
function populateRatioQueries(toPopulate, doctor, period, data) {
    var resultPoluated = false;
    var queryTitles = queries.getTitles();

    var docInfo = doctors.getDoctorInfo(doctor);

    var queryInfo;
    var ratioObject;
    queryTitles
	    .forEach(function(queryTitle) {
		queryInfo = queries.getQueryInfo(queryTitle);

		// only process ratio type entries
		if (queryInfo.type.toLowerCase() === "ratio") {
		    // Get values for query for time period
		    var results = extractResult(queryTitle, "Ratio", docInfo.pid, period, data);

		    if (results !== null) {
			// Follow path from config to ratio object
			var pathElements = queryInfo.XMLPath.split('.');
			if ((pathElements.length === 0)
				|| !(pathElements[0] === "ReportingCategories")) {
			    // We have invalid configuration of a ratio query
			    // with an XML
			    // path not under ReportingCategories
			    throw "Invalid query configuration for query \""
				    + queryTitle
				    + "\". Ratio query with XML path \""
				    + queryInfo.XMLPath
				    + "\". Path must be under ReportingCategories for ratio queries.";
			} else {
			    // Remove ReportingCategories as we are already in
			    // the ReportingCategories object
			    pathElements.splice(0, 1);

			    // Traverse down the path from the object passed to populate,
			    // creating elements as required
			    ratioObject = toPopulate;
			    pathElements.forEach(function(element) {
				if (!ratioObject[element]) {
				    // create it
				    ratioObject[element] = {};
				}
				ratioObject = ratioObject[element];
			    });

			    ratioObject['@'] = {
				'numerator' : results.numerator,
				'denominator' : results.denominator
			    };
			    
			    // We have successfully populated a result
			    resultPoluated = true;
			    
			}

		    }

		}
	    });
    
    return resultPoluated;
}

/**
 * Populates the object passed with a "TenYearRanges" type result.
 * 
 * @param toPopulate
 *                {object} Object to populate with result
 * @param xmlPath
 *                {string} The XMLPath value to search for in order to obtain
 *                the query from which to pull the data to use to populate the
 *                object
 * @param doctor
 *                {string} The CSP Id for the doctor for whom the data should be
 *                taken
 * @param period
 *                {object} The time period for which the data should be taken
 * @param data
 *                {object} The data object from which to pull the data
 * @returns {Boolean} whether the object was successfully populated with data
 */
function populateTenYearRanges(toPopulate, xmlPath, doctor, period, data) {
    var docInfo = doctors.getDoctorInfo(doctor);
    var sourceQueryTitle = queries.findTitleByXmlPath(xmlPath);
    if(sourceQueryTitle) {
	// We have an appropriate query defined
        var results = extractResult(sourceQueryTitle, "TenYearRanges", docInfo.pid, period, data);
    
        if (results !== null) {
            // We have a valid, complete result
            // Previous calls have ensured that toPopulate is the correct destination.
            // Populate object from result
            Object.keys(results).forEach(function (subObject) {
        	// Filter to gender sub objects
        	if((subObject == "Male")
        		|| (subObject == "Female")
        		|| (subObject == "Unspecified")) {
                	// Create gender tag if not yet created
                	if(!toPopulate[subObject]) {
                	    toPopulate[subObject] = {};
                	}
                	
                	// Save under TenYearRanges Tag 
                	toPopulate[subObject]["TenYearRanges"] = results[subObject];
        	}
            });
            
            // We were successful at populating a result
            return true;
        }
    }
    
    // We were unable to populate
    return false;
}

/**
 * Return a string representation of the moment object passed in the correct
 * format for AMCARE scorecards
 * 
 * @param moment
 *                {moment} Moment to output
 * @returns {string} A string representation of the moment object passed in the
 *          correct format for AMCARE scorecards
 */
function formatMomentScorecard(moment) {
    return moment.format("YYYY-MM-DD[T]HH:MM:ss");
}

// Persistent storage used by getTotalSortTime and addToTotalSortTime
var sortTime = moment.duration();

/**
 * Returns a moment duration of the total length of time that could possibly be
 * reduced if caching of processed data was implemented
 * 
 * @returns {moment.duration} The total length of time that could possibly be
 *          reduced if caching of processed data was implemented
 */
function getTotalSortTime() {
    return sortTime;
}

/**
 * Adds the duration of time that has passed since the moment passed to the
 * stored total sort time. If duration is 0 milliseconds (too short to measure)
 * 1 millisecond (minimum duration length) is added.
 * 
 * @param start
 *                {moment} Moment object for the point it time of the start of
 *                the duration to add
 */
function addToTotalSortTime(start) {
    var diff = moment.duration(moment().diff(start));
    if(diff.asMilliseconds() === 0) {
	// Time was too short to measure.
	// Overestimate
	diff.add(1, "milliseconds");
    }
    sortTime.add(moment.duration(diff));
}


// Exports
module.exports = {
	createScorecard : createScorecard,
	getTotalSortTime : getTotalSortTime
};
