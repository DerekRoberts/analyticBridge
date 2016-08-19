// Strict mode
"use strict";


// Requires for date formatting, file system, UUIDs, JSON-XML and SCP
var moment = require('moment');
var fs = require('fs');
var nodeUUID = require( 'node-uuid' );
var js2xmlparser = require('js2xmlparser');
var scpClient = require('scp2');

// Requires for reading the query list and SCP settings
var queries = require('./queries.js');

var doctors = require( __dirname + '/../lib/' + 'doctors.js' );
var connectionsConfig = require('./connections.js');

// Semaphore for limiting number of simultaneous uploads
var sem = require('semaphore')(connectionsConfig.getUpload().maxConnections);

/**
 * Exports the scorecard passed via SCP or local saving according to
 * configuration settings
 * 
 * @param scorecard
 *                {object} Scorecard JSON object ot be exproted
 * @param doctor
 *                {string} CPSCId of doctor scorecard is for
 * @param period
 *                {object} Time period object that scorecard is for
 * @param callback
 *                {function} Callback to call when complete. Call with no
 *                arguments if successful, or pass error message
 */
function exportScorecard(scorecard, doctor, period, callback) {

    var docInfo = doctors.getDoctorInfo(doctor);

    // create filename for resulting scorecard
    var filename = docInfo.msp + "_" + period.end.format("YYYY_MM_DD") + "_"
	    + docInfo.exportAs + ".xml";

    var scorecardContents = js2xmlparser('ScoreCard', scorecard);

    if (!connectionsConfig.getUpload().saveLocal) {
	// SaveLocal is not defined or false. Use standard SCP upload.
	
	// Attempt to read user's home directory
	 var homeDir;
	  switch( process.platform ){
	    case 'linux':
	      homeDir = process.env[ 'HOME' ];
	      break;
	    case 'win32':
	      homeDir = process.env[ 'USERPROFILE'];
	      break;
	    default:
	      console.log( 'Unrecognized OS.  Treating current directory as HOMEDIR.' );
	      homeDir = __dirname;
	}
	
	var privateKeyPath = homeDir + '/.ssh/id_rsa'

	// configure connection
	scpClient.defaults({
	    port : connectionsConfig.getUpload().port,
	    host : connectionsConfig.getUpload().host,
	    username : connectionsConfig.getUpload().username,
	    privateKey : fs.readFileSync(privateKeyPath)
	});
	
	
	
	// Limit simultaneous connection using semaphore
	sem.take(function() {
        	// Send Scorecard text
        	scpClient.write({
        	    destination : "~/uploads/" + filename,
        	    content : new Buffer(scorecardContents, "utf-8")
        	}, function(error) {
        	    scpClient.close();
        	    
        	    // Unlock sempahore
        	    sm.leave();
        	    
        	    if (error) {
        		console.log("Error sending scorecard: " + error);
        		callback(error);
        	    } else {
        		console.log("Successfully sent scoredard: " + filename);
        		callback();
        	    }
        	    
        	});
	});
    } else {
	// Save file, using savePath from index.js
	var savePath = __dirname + '/../scorecards/';

	var saveFile = savePath + filename;

	// Use debugging save to local filesystem method
	//fs.writeFileSync(saveFile, scorecardContents);
	fs.writeFile(saveFile, scorecardContents, function(error) {
	    if (error) {
		console.log("Successfully saved scorecard locally to: " + saveFile + "\n" + error);
		callback(error);
	    } else {
		console.log("Successfully saved scorecard locally to: " + saveFile);
		callback();
	    }
	});
    }
}

// Exports
module.exports = {
    exportScorecard : exportScorecard,
};
