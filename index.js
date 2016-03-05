// ScoreCard blank
var scorecard = require( './config/scorecard.json' );

// XML output
var parser = require( 'xml2json' );

// Raw doctor data for XML headers
var headers = require( './lib/headers.js' ).raw;
//console.log( headers );

// Obtain queries, specified in ./lib/queries.json
var executions = require( './lib/executions.js' );
executions.executions( function( error, results ){
  if( error ){ throw new Error( error )}

  //console.log( results );
  return results;
});
