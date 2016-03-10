// ScoreCard blank
var scorecard = require( './config/scorecard.json' );

// Raw doctor data for XML headers
var headers = require( './lib/headers.js' );

// Store processed doctor and query data
var doc_data = [];

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

    if( typeof results[ doc ] == 'object' && Object.keys(results[doc])){
      Object.keys( results[ doc ]).forEach( function( query ){
        if( results[ doc ][ query ][ 0 ].category === 'ReportingCategories' ){
          doc_data[ doc ][ 'ReportingCategories' ][ query ] = results[ doc ][ query ];
        }
      });
    }
  });

  // TODO: Make this less of a mess
  // TODO: Make a clean return function
  return doc_data;
}

// Obtain queries, specified in ./lib/queries.json
var executions = require( './lib/executions.js' );
var blah = executions.executions( function( error, results ){
  if( error ){ throw new Error( error )}

  console.log( doc_builder( results ));
  return doc_builder( results );
});

// Pretty print a scorecard
function toXml( completed_scorecard ){

  var js2xmlparser = require( "js2xmlparser" );
  return js2xmlparser( "ScoreCard", completed_scorecard );
}
