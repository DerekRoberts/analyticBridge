// Strict mode
"use strict";


var async = require('async');
var moment = require('moment');
// ScoreCard blank
var scorecardTemplate = require( __dirname + '/config/' + 'scorecard.json' );
// Mongo DB executions
var executions = require( __dirname + '/lib/' + 'executions.js' );
// Doctor data 
var doctors = require( __dirname + '/lib/' + 'doctors.js' );
// Query list, with types and xml paths
var queries = require( __dirname + '/lib/' + 'queries.js');
var util = require( __dirname + '/lib/' + 'util.js');
var scorecardPeriods = require( __dirname + '/lib/' + 'scorecardPeriods.js');
var scorecardBuilder = require( __dirname + '/lib/' + 'scorecardBuilder.js');
var scorecardExporter = require( __dirname + '/lib/' + 'scorecardExporter.js');

/**
 * Entry point for execution
 */
main();

/**
 * Function called as entry point for execution
 */
function main() {
  // Obtain query execution data
  var executionStart = moment();
  executions.getAllData( function( error, data ){
    if( error ){ throw new Error( error )}
    
    // Get list of time periods for which to attempt to generate scorecards
    var periods = scorecardPeriods.getScorecardPeriods();
    // Get list of doctors for which to attempt to generate scorecards
    var doctorList = doctors.getDoctors();
    
    var requests = []
    var request;
    // Prepare scorecard request for each combination of doctor and period
    doctorList.forEach(function( doctor ){
	periods.forEach(function( period ){
	    request = {};
	    request.doctor = doctor;
	    request.period = period;

	    requests.push(request);
	});
    });
    
    // Process each scorecard request asynchronously in parallel for efficiency.
    // Update: Tests indicate no performance gain from parallel processing in current 
    // hardware and system environment. Process request sequentially to show
    // continuous progress. 
    async.eachLimit(requests, 1, function(request, callback) {
	processScorecardRequest(request.doctor, request.period, data, callback);
    }, function(err) {
	
	scorecardExporter.closeConnection();
	
        // if any of the scorecard request processing produced an error, err would equal that error
        if( err ) {
          // One of the iterations produced an error.
          // All processing will now stop.
          console.log('Scorecard processing halted due to error: ' + err);
        } else {
          console.log('All scorecard requests processed successfully');
          
          // Output execution time in a friendly manner
          var executionDuration = moment.duration(moment().diff(executionStart));
          if(executionDuration.asMinutes() >= 2.0) {
              console.log("Completed in " + Math.ceil(executionDuration.asMinutes()) + " minutes");
          } else if(executionDuration.asSeconds() >= 2.0) {
              console.log("Completed in " + Math.ceil(executionDuration.asSeconds()) + " seconds");
          } else {
              console.log("Completed in " + Math.ceil(executionDuration.asMilliseconds()) + " milliseconds");
          }
          
          // Output possible cache savings time in a friendly manner
          var cachingDuration = scorecardBuilder.getTotalSortTime();
          if(cachingDuration.asMinutes() >= 2.0) {
              console.log("Time spent on operations that could possibly be reduced by caching: " 
        	      + Math.ceil(cachingDuration.asMinutes()) + " minutes");
          } else if(cachingDuration.asSeconds() >= 2.0) {
              console.log("Time spent on operations that could possibly be reduced by caching: " 
        	      + Math.ceil(cachingDuration.asSeconds()) + " seconds");
          } else {
              console.log("Time spent on operations that could possibly be reduced by caching: " 
        	      + Math.ceil(cachingDuration.asMilliseconds()) + " milliseconds");
          }
        }
    });
  });
    
}

/**
 * Attempt to generate and export a scorecard based on the parameters passed
 * 
 * @param doctor
 *                {string} CPSId of doctor for which to attempt to generate
 *                scorecard
 * @param period
 *                {object} Time period containing start and end moment date
 *                objects indicating the time period for which to attempt to
 *                generate a scorecard
 * @param {data}
 *                Object containing all data from which the data for the
 *                scorecard should be pulled
 * @param callback
 *                {function} Callback to be called when operation is complete.
 *                Call with no argument if successful, pass error if error
 *                occurred.
 */
function processScorecardRequest(doctor, period, data, callback) {
    var scorecard = scorecardBuilder.createScorecard(scorecardTemplate, doctor, period, data);
    
    if(scorecard !== null) {
	// We have a scorecard to export
	scorecardExporter.exportScorecard(scorecard, doctor, period, callback);
    } else {
	console.log("Insufficient data to generate scorecard for " + period.end.format("YYYY-MM-DD"));
	callback();
    }
}

