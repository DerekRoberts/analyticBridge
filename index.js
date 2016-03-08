// ScoreCard blank
var scorecard = require( './config/scorecard.json' );

// XML output
var parser = require( 'xml2json' );

// Raw doctor data for XML headers
var headers = require( './lib/headers.js' ).raw;
var target = headers.cpsid;

// Obtain queries, specified in ./lib/queries.json
var executions = require( './lib/executions.js' );
executions.executions( function( error, results ){
  if( error ){ throw new Error( error )}

  return results;
});

// Pretty print a scorecard
function toXml( completed_scorecard ){
  var pd = require( 'pretty-data' ).pd;
  return pd.xml( parser.toXml( completed_scorecard ));
}

var xml = toXml( scorecard );
console.log( xml );
