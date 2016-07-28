// Strict mode
"use strict";


// Requires for MongoDB and query titles via query_list.js
var mdb    = require('mongodb').MongoClient;
var titles = require( './query_list.js' ).titles();


// Combine JSON strings and values to create single objects
function combine_results( raw_aggregate_results, title ){
  // Returns aggregates
  var aggregates = [];

  // JSON strings are also keys to values
  try{
    var json_partials = Object.keys( raw_aggregate_results );
    json_partials.forEach( function( text ){

      // Verify each line is JSON (e.g. some query errors are not)
      try{
        var result   = JSON.parse( text );
        result.value = raw_aggregate_results[ text ];
        aggregates.push( result );
      }
      catch( error ){
        console.log( "Failed JSON.parse on " + title.title + ": " + text );
      }
    });
  }
  catch( err ){
    console.log( err );
    return( err, aggregates );
  }

  return( null, aggregates );
}

// Get Mongo queries, not yet combined into complete JSON
function mongo_get( title, callback ){
  // Mongo setup
  var uri    = 'mongodb://localhost:27017/query_composer_development';
  var title  = { "title": title };
  var filter = { title: 1, executions: 1 };

  // Connect to Mongo, requires MONGO.close() later
  mdb.connect( uri, function( error, db ){
    if( error ){ throw new Error( error )}

    // Collection and command passing for single Mongo query
    db.collection('queries').find( title, filter ).toArray( function( error, documents ){
      if( error ){ throw new Error( error )}

      // Aggregates object, will contained combined results
      var aggregates = {};

      // See if there is a result for the query title
      // there should only be at most one result per query title
      if( documents[ 0 ]){
        var executions = documents[0].executions;

        // Take the most recent result by date
        // TODO: Take result based on date passed in
        if( executions ){
          aggregates = executions[ executions.length - 1 ].aggregate_result
        }
      }

      // Close DB connection and return combined results of aggregates
      db.close();
      callback( null, combine_results( aggregates, title ));
    });
  });
}

// Arrange single query combined aggregates by doctor ID
function process_results( title, result, toReturn ){
  // If there are results, then arrange them
  if( result[0] ){
    result.forEach( function( x ){
      var doc   = x.doctor.toString();

      if( ! toReturn[ doc ]){
        toReturn[ doc ] = [];
      }

      if( ! toReturn[ doc ][ title ]){
        toReturn[ doc ][ title ] = [];
      }

      toReturn[ doc ][ title ].push( x );
    });
  }

  return toReturn;
}

// Mongo find for multiple queries
function get_all_executions( callback ){
  var toReturn = [];

  // Pass titles as static key/pair object (consistency + functions)
  process_query( titles.entries(), toReturn, callback);
}

// Serial recursive function
// Requires an array to iterate through, a bucket and a callback
function process_query( iterator, bucket, callback ) {
  var title = iterator.next();

  if( title.done === true ){
    // Callback when done (no next object)
    callback( null, bucket );
  }
  else {
    // ...Otherwise query for the title (0 = key, 1 = value)
    mongo_get( title.value[1], function( error, result ){
      if( error ){ throw new Error( error )}

      process_results( title.value[1], result, bucket );

      // ...And recurse
      process_query( iterator, bucket, callback );
    });
  }
}

// Mongo find, uses query title and filter objects
module.exports = {
  executions: get_all_executions
}
