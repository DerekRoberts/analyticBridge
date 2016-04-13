function create_scorecard(scorecard_template, all_doctors, callback) {
    var js2xmlparser = require('js2xmlparser');
    var queries = require('./query_list.js');
    var uploadConfig = require('./upload_config.js');

    var scorecard_json = {};
    var scorecard_header;
    var doctors = Object.keys(all_doctors);

    var doc_data;
    // Cycle through each doctor and create a scorecard for each one
    doctors
	    .forEach(function(d) {
		// Get a fresh, blank template
		scorecard_json = JSON.parse(JSON.stringify(scorecard_template));
		scorecard_header = scorecard_json.ScoreCardHeader;
		// Get data for doctor this scorecard is for
		doc_data = all_doctors[d];

		// fill in the header information
		scorecard_header['UniqueScoreCardIdentifier'] = require(
			'node-uuid').v4();
		scorecard_header['ScoreCardMode']['SinglePhysicianPracticeSubsetScoreCard']['ReportingPhysicianMSPNumber'] = doc_data.header.msp;

		if (doc_data.PatientCounts[0]) {
		    // fill in date date if we have patient count date from
		    // which to pull it
		    var data_date = doc_data.PatientCounts[0].date;
		    scorecard_header['ScoreCardDataDateTime'] = formatDateAMCARE(data_date);
		}

		// Current time, for ScoreCardGenerationDateTime
		scorecard_header['ScoreCardGenerationDateTime'] = formatDateAMCARE(new Date());

		// fill in ratio query results
		var ratio_query_titles = Object
			.keys(doc_data.ReportingCategories);

		// Create ratio query objects (w/ denominator and numerator)
		ratio_query_titles
			.forEach(function(ratio_query_title) {

			    var ratio_results = doc_data.ReportingCategories[ratio_query_title];
			    var denominator = ratio_results.denominator;
			    var numerator = ratio_results.numerator;

			    // Error check for denominator and numerator
			    if ((typeof denominator !== 'number')
				    || (typeof numerator !== 'number')) {
				throw new Error(
					ratio_query_title
						+ ' - missing denominator and/or numerator');
			    }

			    // Save single object with denominator and numerator
			    var empty_object = create_object_at_path(
				    scorecard_json,
				    queries.raw[ratio_query_title].xml_path);
			    empty_object['@'] = {
				'numerator' : numerator,
				'denominator' : denominator
			    };
			});

		// populate Patient Counts in JSON scorecard object
		var patient_count_query_results = doc_data.PatientCounts;

		patient_count_query_results
			.forEach(function(result) {
			    // Pull age category tag name from config file
			    var age_category_tag = queries.raw.PatientCounts.map[result.agesMin];
			    var destination_parent = scorecard_json.PatientCounts[result.gender][result.category];

			    destination_parent[age_category_tag] = result.value;
			});

		// create filename fro resulting scorecard
		var dateFormat = require("dateformat");
		var filename = doc_data.header.msp + "_"
			+ dateFormat(new Date(), "yyyy-mm-dd_HH:MM:ss.l") + "_"
			+ doc_data.header.export_as + ".xml";
		var scorecardContents = js2xmlparser('ScoreCard',
			scorecard_json);

		if (!uploadConfig.raw.saveLocal) {
		    // SaveLocal is not defined or false. Use standard SCP upload.
		    var scpClient = require('scp2');
		    // configure connection
		    scpClient.defaults({
			port : uploadConfig.raw.port,
			host : uploadConfig.raw.host,
			username : uploadConfig.raw.username,
			privateKey : require('fs').readFileSync(
				uploadConfig.raw.privateKeyPath)
		    });

		    // send Scorecard text
		    scpClient.write({
			destination : uploadConfig.raw.destinationPath
				+ filename,
			content : new Buffer(scorecardContents, "utf-8")
		    }, function(error) {
			if (error) {
			    console.log("Error sending scorecard: " + error);
			} else {
			    console.log("Successfully sent scoredard: "
				    + filename);
			}
			scpClient.close();
		    });
		} else {
		    // Use debugging save to local filesystem method
		    require( 'fs' ).writeFileSync( uploadConfig.raw.saveLocalPath + filename, scorecardContents);
		    console.log("Successfully saved scoredard locally to: "
			    + uploadConfig.raw.saveLocalPath + filename);
		}

	    });
    // Return with callback
    // There is nothing to return as scorecard(s) were already sent
    callback(null, null);
}

// Create an object in a complex path, then use reference
function create_object_at_path(object, path) {
    var path_elements = path.split('.');
    path_elements.forEach(function(element) {
	if (!object[element]) {
	    // create it
	    object[element] = {};
	}
	object = object[element];
    });

    return object;
}

// Format the date passed in the AMCARE Date Format
function formatDateAMCARE(date) {
    var dateFormat = require("dateformat");
    var formatted = dateFormat(date, "yyyy-mm-dd'T'HH:MM:ss");
    return formatted;
}
// Exports
module.exports = {
    create : create_scorecard
};
