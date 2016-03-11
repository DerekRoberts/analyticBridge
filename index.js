// ScoreCard blank
var scorecard = require( './config/scorecard.json' );

// Raw doctor data for XML headers
var headers = require( './lib/headers.js' );

// Store processed doctor and query data
var doc_data = [];

// Combines ReportingCategories queries into single objects
function result_combiner( result_set ){
  var result_combined = {};
  if( result_set.length && result_set[0].category === "ReportingCategories" ){

    var date     = result_set[0].date;
    var result   = result_set[0].result;
    var value    = result_set[0].value;

    result_combined['date'] = date;
    result_set.forEach( function( r ){
      result_combined[ r.result ] = r.value;
    });

    // console.log( result_combined );
    result_set = result_combined;
    return result_combined;
  }
  return result_set;
}

function doc_builder( results ){
  var doctors = headers.doctors();

  doctors.forEach( function( doc ){

    // Create map for doc name, header, PatientCounts and ReportingCategories
    doc_data[ doc ] = [];
    doc_data[ doc ][ 'header' ] = headers.raw[ doc ];
    doc_data[ doc ][ 'PatientCounts' ] = [];
    doc_data[ doc ][ 'ReportingCategories' ] = [];

    // If there are PatientCounts, add them
    if( results[ doc ] && results[ doc ][ 'PatientCounts' ]){
      doc_data[ doc ][ 'PatientCounts' ]= results[ doc ][ 'PatientCounts' ];
      delete results[ doc ][ 'PatientCounts' ];
    }

    if( typeof results[ doc ] == 'object' && Object.keys(results[ doc ])){
      Object.keys( results[ doc ]).forEach( function( query ){
        if( results[ doc ][ query ][ 0 ].category === 'ReportingCategories' ){
          doc_data[ doc ][ 'ReportingCategories' ][ query ] = result_combiner( results[ doc ][ query ]);
        }
      });
    }
  });

  xml_builder( scorecard, doc_data );
  return doc_data;
}

function xml_builder( json_template, all_doctors ){
  var xb = require('./lib/xml_builder.js');
  xb.test( json_template, all_doctors  );
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
