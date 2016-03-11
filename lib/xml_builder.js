function create_scorecard( scorecard_template, all_doctors, callback ){
	var js2xmlparser = require( 'js2xmlparser' );
	var queries      = require( './query_list.js' );

	var scorecard_xml = [];
	var scorecard_json = {};
	var scorecard_header;
	var doctors = Object.keys( all_doctors );

	// scorecard_json.<xml path string from queries> = value;
	var debug_output_first = true;

	var doc_data;
	doctors.forEach( function( d ){
		scorecard_json   = JSON.parse(JSON.stringify(scorecard_template));
		scorecard_header = scorecard_json.ScoreCardHeader;
		doc_data         = all_doctors[ d ];

		// fill in the header information
		scorecard_header['UniqueScoreCardIdentifier'] = require( 'node-uuid' ).v4();
		scorecard_header['ScoreCardMode']['SinglePhysicianPracticeSubsetScoreCard']
			['ReportingPhysicianMSPNumber']	= doc_data.header.msp;

		if(doc_data.PatientCounts[0]) {
			// fill in date date if we have patient count date from which to pull it
			var data_date = doc_data.PatientCounts[0].date;
			scorecard_header['ScoreCardDataDateTime'] = data_date;
		}

		// Current time, for ScoreCardGenerationDateTime
		scorecard_header['ScoreCardGenerationDateTime']	= (new Date()).getTime();

		// fill in ratio query results
		var ratio_query_titles = Object.keys(doc_data.ReportingCategories);

		// Create ratio query objects (w/ denominator and numerator)
		ratio_query_titles.forEach( function ( ratio_query_title ) {

			var ratio_results = doc_data.ReportingCategories[ratio_query_title];
			var denominator = ratio_results.denominator;
			var numerator   = ratio_results.numerator;

			// Error check for denominator and numerator
			if(( typeof denominator !== 'number' )||( typeof numerator !== 'number' ))
			{
				throw new Error( ratio_query_title +' - missing denominator and/or numerator' );
			}

			// Save single object with denominator and numerator
			var empty_object = create_object_at_path(scorecard_json, queries.raw[ratio_query_title].xml_path);
			empty_object['@'] = {'numerator' : numerator, 'denominator' : denominator};
		});

		// populate Patient Counts in JSON scorecard object
		var patient_count_query_results = doc_data.PatientCounts;


		patient_count_query_results.forEach( function ( result ) {
			// Pull age category tag name from config file
			var age_category_tag = queries.raw.PatientCounts.map[result.age_min];
			var destination_parent = scorecard_json.PatientCounts[result.gender][result.category];

			destination_parent[age_category_tag] = result.value;
		});

		// Convert JSON to XML and save
		scorecard_xml.push( js2xmlparser( 'ScoreCard', scorecard_json ));

		// Return with callback
		callback( null, scorecard_xml );
	});
}

// Create an object in a complext path, then use reference
function create_object_at_path( object, path) {
	var path_elements = path.split('.');
	path_elements.forEach( function ( element ) {
		if(!object[element]) {
			// create it
			object[element] = {};
		}
		object = object[element];
	});

	return object;
}

// Exports
module.exports = {
	create : create_scorecard
};
