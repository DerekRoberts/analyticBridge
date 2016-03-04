// Receive processed query input list from query_list.js
var query_list = require( './query_list.js' );
var titles     = query_list.titles();

// Combine JSON strings and values to create single objects
function combine_results( raw_aggregate_results, callback ){

  // Returns aggregates
  var aggregates = [];

  // JSON strings are also keys to values
  var json_partials = Object.keys( raw_aggregate_results );
  json_partials.forEach( function( text ){
    var result   = JSON.parse( text );
    result.value = raw_aggregate_results[ text ];
    aggregates.push( result );
  });

  return( null, aggregates );
}

// Mongo find, uses query title and filter objects
function get_executions( title, filter, callback ){

  // Require and uri for MongoClient
  var mdb = require('mongodb').MongoClient;
  var uri = 'mongodb://localhost:27017/query_composer_development';
  mdb.connect( uri, function( error, db ){
    if( error ){ throw new Error( error )}

    // Collection and command passing for single Mongo query
    // TODO: Possibly handle multiple query titles (single=docs[0])
    var collection = db.collection('queries');
    collection.find( title, filter ).toArray( function( error, docs ){

      // Processes aggregates for a single execution, ignores others
      // TODO: Handle multiple executions
      var aggregate_result = docs[0].executions[0].aggregate_result;
      var toReturn = combine_results( aggregate_result );
      db.close()
      callback( null, toReturn );
    });
  });
}

//
var title  = { title: "PatientCounts" };
var filter = { title: 1, executions: 1 };
var query_results = get_executions( title, filter, function( error, res ){
  if( error ){ throw new Error( error )}

  console.log( res );
});

module.exports ={
  test:"yup, that's a test"
}
