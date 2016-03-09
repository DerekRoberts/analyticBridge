// ScoreCard blank
var scorecard = require( './config/scorecard.json' );

// Raw doctor data for XML headers
var headers = require( './lib/headers.js' ).raw;

// Obtain queries, specified in ./lib/queries.json
var executions = require( './lib/executions.js' );
executions.executions( function( error, results ){
  if( error ){ throw new Error( error )}

  return results;
});

// Pretty print a scorecard
function toXml( completed_scorecard ){

  var js2xmlparser = require( "js2xmlparser" );
  return js2xmlparser( "ScoreCard", completed_scorecard );
}
