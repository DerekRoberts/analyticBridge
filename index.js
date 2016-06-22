// Strict mode
"use strict";

// Store directory paths
global.__configdir = __dirname + '/config/';
global.__libdir    = __dirname + '/lib/';
global.__savedir   = __dirname + '/scorecards/';


// ScoreCard blank
var scorecard = require( __configdir + 'scorecard.json' );

// Mongo DB executions
var executions = require( __libdir + 'executions.js' );

// Doctor data for XML headers
var headers = require( __libdir + 'headers.js' );

// Query list, with types and xml paths
var query_list = require( __libdir + 'query_list.js');

// XML builder
var xml_builder = require( __libdir + 'xml_builder.js');

// Store processed doctor and query data
var doc_data = [];


// Combines ReportingCategories queries into single objects
function result_combiner( result_set ){
  var result_combined = {};

  // Combine ratio results
  if( result_set.length && result_set[ 0 ].type === "Ratio" ){

    var date     = result_set[ 0 ].date;
    var result   = result_set[ 0 ].result;
    var value    = result_set[ 0 ].value;

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
function createXML( json_template, all_doctors ){
  xml_builder.create( json_template, all_doctors, function( error, results ){
    if( error ){ throw new Error( error )}

    // No further work is needed as xml_builder sends any scorecard(s) created
  });
}


// Build data structure with results organized by doctor
function doc_builder( results ){
  var doctors = headers.doctors();

  // Get titles for patient and contact counts
  var titlePatientCounts = query_list.findTitleByXmlPath( 'PatientCounts' );
  var titleContactCounts = query_list.findTitleByXmlPath( 'ContactCounts' );

  doctors.forEach( function( doc ){

    // Create doctor data object and header info
    doc_data[ doc ] = [];
    doc_data[ doc ][ 'header' ] = headers.raw[ doc ];

    // If there are PatientCounts, add them
    if( results[ doc ] && results[ doc ][ titlePatientCounts ]){
      doc_data[ doc ][ 'PatientCounts' ]= results[ doc ][ titlePatientCounts ];
      delete results[ doc ][ titlePatientCounts ];
    }

    // If there are ContactCounts, add them
    if( results[ doc ] && results[ doc ][ titleContactCounts ]){
      doc_data[ doc ][ 'ContactCounts' ]= results[ doc ][ titleContactCounts ];
      delete results[ doc ][ titleContactCounts ];
    }

    // If there are ReportingCategories, add them
    if( typeof results[ doc ] == 'object' && Object.keys(results[ doc ])){
      doc_data[ doc ][ 'ReportingCategories' ] = [];
      Object.keys( results[ doc ]).forEach( function( query ){

        // Filter out non-essential result objects (not numerator or denominator)
        results[ doc ][ query ] = results[ doc ][ query ].filter( function( execObj ){
          if(
            ( execObj.result === 'denominator' )||
            ( execObj.result === 'numerator' )
          ){
            return true;
          }
        });

        if( results[ doc ][ query ][ 0 ].type === 'Ratio' ){
          doc_data[ doc ][ 'ReportingCategories' ][ query ] = result_combiner( results[ doc ][ query ]);
        }
        else {
          console.log( "Rejected: "+ query +", type: "+results[ doc ][ query ][ 0 ]);
        }
      });
    }

  });

  // Create XML files
  createXML( scorecard, doc_data );
  return doc_data;
}


// Obtain query executions
executions.executions( function( error, results ){
  if( error ){ throw new Error( error )}

  return doc_builder( results );
});
