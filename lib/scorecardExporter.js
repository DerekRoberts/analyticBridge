// Strict mode
"use strict";

// Requires for date formatting, file system, UUIDs, JSON-XML and SCP
var moment = require('moment');
var fs = require('fs');
var nodeUUID = require('node-uuid');
var js2xmlparser = require('js2xmlparser');
var scpClient = require('scp2');

// Requires for reading the query list and SCP settings
var queries = require('./queries.js');

var doctors = require(__dirname + '/../lib/' + 'doctors.js');
var connectionsConfig = require('./connections.js');

// Semaphore for preventing simultaneous uploads as this triggered errors
var sem = require('semaphore')(1);

/**
 * Exports the scorecard passed via SCP or local saving according to
 * configuration settings
 * 
 * @param scorecard
 *            {object} Scorecard JSON object ot be exproted
 * @param doctor
 *            {string} CPSCId of doctor scorecard is for
 * @param period
 *            {object} Time period object that scorecard is for
 * @param callback
 *            {function} Callback to call when complete. Call with no arguments
 *            if successful, or pass error message
 */
function exportScorecard(scorecard, doctor, period, callback) {

	var docInfo = doctors.getDoctorInfo(doctor);

	// create filename for resulting scorecard
	// The date in the label should be the day after the end of the period
	var dateLabel = new moment(period.end).add(1, "days");
	var filename = docInfo.msp + "_" + dateLabel.format("YYYY_MM_DD") + "_"
	        + docInfo.exportAs + ".xml";

	var scorecardContents = js2xmlparser('ScoreCard', scorecard);

	var privateKeyPath;
	if (!connectionsConfig.getUpload().saveLocal) {
		// SaveLocal is not defined or false. Use standard SCP upload.
		if ((typeof connectionsConfig.getUpload().keyPath === 'string' || connectionsConfig
		        .getUpload().keyPath instanceof String)
		        && (connectionsConfig.getUpload().keyPath.length > 0)) {
			// Keypath is explicitly defined in the config
			privateKeyPath = connectionsConfig.getUpload().keyPath;
		} else {
			// Keypath is not defined
			// Use user's keypath

			// Attempt to read user's home directory
			var homeDir;
			switch (process.platform) {
				case 'linux':
					homeDir = process.env['HOME'];
					break;
				case 'win32':
					homeDir = process.env['USERPROFILE'];
					break;
				default:
					console
					        .log('Unrecognized OS.  Treating current directory as HOMEDIR.');
					homeDir = __dirname;
			}

			privateKeyPath = homeDir + '/.ssh/id_rsa'

		}

		// configure connection
		scpClient.defaults({
		    port : connectionsConfig.getUpload().port,
		    host : connectionsConfig.getUpload().host,
		    username : connectionsConfig.getUpload().username,
		    privateKey : fs.readFileSync(privateKeyPath),
		    readyTimeout : 99999
		});

		// Limit simultaneous uploads using semaphore
		sem.take(function() {
			// Send Scorecard text
			scpClient.write({
			    destination : filename,
			    content : new Buffer(scorecardContents, "utf-8")
			}, function(error) {
				// Unlock sempahore
				sem.leave();

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
		// fs.writeFileSync(saveFile, scorecardContents);
		fs.writeFile(saveFile, scorecardContents, function(error) {
			if (error) {
				console.log("Successfully saved scorecard locally to: "
				        + saveFile + "\n" + error);
				callback(error);
			} else {
				console.log("Successfully saved scorecard locally to: "
				        + saveFile);
				callback();
			}
		});
	}
}

/**
 * Close the upload connection. Must be called to properly clean up connection.
 * For efficiency, should only be called when all scorecards have been uploaded.
 * Can be called at any time as connection will automatically be reopened if
 * needed.
 */
function closeConnection() {
	scpClient.close();
}

// Exports
module.exports = {
    exportScorecard : exportScorecard,
    closeConnection : closeConnection
};
