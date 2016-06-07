// ScoreCard blank
var scorecard = require( './config/scorecard.json' );

// Raw doctor data for XML headers
var headers = require( './lib/headers.js' );

// Store processed doctor and query data
var doc_data = [];

// Combines ReportingCategories queries into single objects
function result_combiner( result_set ){
  var result_combined = {};
  if( result_set.length && result_set[0].category === "Ratio" ){

    var date     = result_set[0].date;
    var result   = result_set[0].result;
    var value    = result_set[0].value;

    // Save date in output structure
    result_combined['date'] = date;
    // Save numerator and denominator in output structure
    // r.result should be either "numerator" or "denominator" for
    // queries under "ReportingCategories"
    result_set.forEach( function( r ){
      result_combined[ r.result ] = r.value;
    });

    result_set = result_combined;
    return result_combined;
  }
  return result_set;
}

// Combine template and doctor data into scorecards
function xml_builder( json_template, all_doctors ){
  var xml_builder = require('./lib/xml_builder.js');
  xml_builder.create( json_template, all_doctors, function( error, results ){
    if( error ){ throw new Error( error )}

    // No further work is required as xml_builder sends any scorecard(s) created
  });
}

// Build data structure with results organized by doctor
function doc_builder( results ){
  var doctors = headers.doctors();

  doctors.forEach( function( doc ){

    // Create map for doc name, header, PatientCounts, ContactCounts and ReportingCategories
    doc_data[ doc ] = [];
    doc_data[ doc ][ 'header' ] = headers.raw[ doc ];
    doc_data[ doc ][ 'PatientCounts' ] = [];
    doc_data[ doc ][ 'ContactCounts' ] = [];
    doc_data[ doc ][ 'ReportingCategories' ] = [];

    // If there are PatientCounts, add them
    if( results[ doc ] && results[ doc ][ 'PatientCounts' ]){
      doc_data[ doc ][ 'PatientCounts' ]= results[ doc ][ 'PatientCounts' ];
      delete results[ doc ][ 'PatientCounts' ];
    }

    // If there are ContactCounts, add them
    if( results[ doc ] && results[ doc ][ 'ContactCounts' ]){
      doc_data[ doc ][ 'ContactCounts' ]= results[ doc ][ 'ContactCounts' ];
      delete results[ doc ][ 'ContactCounts' ];
    }

    // If there are ReportingCategories, add them
    if( typeof results[ doc ] == 'object' && Object.keys(results[ doc ])){
      Object.keys( results[ doc ]).forEach( function( query ){
        if( results[ doc ][ query ][ 0 ].category === 'Ratio' ){
          doc_data[ doc ][ 'ReportingCategories' ][ query ] = result_combiner( results[ doc ][ query ]);
        }
      });
    }
  });

  // Create XML files
  xml_builder( scorecard, doc_data );
  return doc_data;
}

// Obtain queries, specified in ./lib/queries.json
var executions = require( './lib/executions.js' );
executions.executions( function( error, results ){
  if( error ){ throw new Error( error )}

  return doc_builder( results );
});

// Pretty print a scorecard
function toXml( completed_scorecard ){

  var js2xmlparser = require( "js2xmlparser" );
  return js2xmlparser( "ScoreCard", completed_scorecard );
}
