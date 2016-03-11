// var fs          = require( 'fs' );
// var doctor_file = JSON.parse( fs.readFileSync( './config/doctors.json' ));
//
// // Return just the query titles
// var doctors = function (){
// 	return Object.keys( doctor_file );
// };


function test( scorecard_template, all_doctors ){
	var js2xmlparser = require( "js2xmlparser" );
	var queries = require( './query_list.js' );
	//console.log( queries.raw['PatientCounts']['xml_path'] );
	//console.log( queries.raw.PatientCounts.xml_path );
	//var test = queries.raw[0].xml_path;

	// console.log( js2xmlparser( "ScoreCard", scorecard_template ));


	var scorecard_xml = [];
	var scorecard_json = {};
	var doctors = Object.keys( all_doctors );

	//console.log("all_doctor = " + all_doctors);
	//require('./util.js').pp(all_doctors);



	// scorecard_json.<xml path string from queries> = value;

	var debug_output_first = true;

	doctors.forEach( function( d ){
		//console.log(scorecard_template);

		scorecard_json = JSON.parse(JSON.stringify(scorecard_template));

		var header_info = all_doctors[d].header;

		// fill in the header information
		var uuid = require( 'node-uuid' );
		scorecard_json.ScoreCardHeader["UniqueScoreCardIdentifier"] = uuid.v4();
		scorecard_json.ScoreCardHeader.ScoreCardMode
		.SinglePhysicianPracticeSubsetScoreCard
		["ReportingPhysicianMSPNumber"] = header_info.msp;


		if(all_doctors[d].PatientCounts[0]) {
			// fill in date date if we have patient count date from which to pull it
			var data_date = all_doctors[d].PatientCounts[0].date;
			scorecard_json.ScoreCardHeader["ScoreCardDataDateTime"] = data_date;
		}

		scorecard_json.ScoreCardHeader["ScoreCardGenerationDateTime"]
			= new Date();






		// fill in ratio query results
		var ratio_query_titles = Object.keys(all_doctors[d].ReportingCategories);

		ratio_query_titles.forEach( function ( ratio_query_title ) {

			var ratio_results = all_doctors[d].ReportingCategories[ratio_query_title];
			var denominator = ratio_results.denominator;
			var numerator   = ratio_results.numerator;

			if(( typeof denominator !== 'number' )||( typeof numerator !== 'number' ))
			{
				throw new Error( ratio_query_title +" - missing denominator and/or numerator" );
			}

			var empty_object = create_object_at_path(scorecard_json, queries.raw[ratio_query_title].xml_path);
			empty_object["@"] = {"numerator" : numerator, "denominator" : denominator};
		});


		// populate Patient Counts in JSON scorecard object
		var patient_count_query_results = all_doctors[d].PatientCounts;


		patient_count_query_results.forEach( function ( result ) {
			// Pull age category tag name from config file
			var age_category_tag = queries.raw.PatientCounts.map[result.age_min];

			var destination_parent = scorecard_json
			.PatientCounts[result.gender][result.category];
			// console.log("Setting value of PatientCounts."
			// + result.gender + "." + result.category + "." + age_category_tag + " = " +
			// destination);

			destination_parent[age_category_tag] = result.value;
		});



		scorecard_xml.push( js2xmlparser( "ScoreCard", scorecard_json ));

		if(debug_output_first) {
			console.log(js2xmlparser( "ScoreCard", scorecard_json ));
			debug_output_first = false;
		}
	});

}

function create_object_at_path( object, path) {
	var path_elements = path.split(".");
	path_elements.forEach( function ( element ) {
		if(!object[element]) {
			// create it
			object[element] = {};

		}
		object = object[element];
	});

	return object;


}

module.exports = {
	test : test
};
