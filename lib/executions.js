// Combine JSON strings and values to create single objects
function combine_results( raw_aggregate_results ){
  // Returns aggregates
  var aggregates = [];

  // JSON strings are also keys to values
  var json_partials = Object.keys( raw_aggregate_results );
  json_partials.forEach( function( text ){

    // Parse strings
    var result   = JSON.parse( text );
    result.value = raw_aggregate_results[ text ];
    aggregates.push( result );
  });

  return( null, aggregates );
}

// Get Mongo queries, not yet combined into complete JSON
function mongo_get( title, callback ){
  // Mongo setup
  var mdb    = require('mongodb').MongoClient;
  var uri    = 'mongodb://localhost:27017/query_composer_development';
  var title  = { "title": title };
  var filter = { title: 1, executions: 1 };

  // Connect to Mongo, requires MONGO.close() later
  mdb.connect( uri, function( error, db ){
    if( error ){ throw new Error( error )}

    // Collection and command passing for single Mongo query
    db.collection('queries').find( title, filter ).toArray( function( error, documents ){
      if( error ){ throw new Error( error )}

      if( documents[ 0 ]){
        var executions = documents[0].executions;
        var aggregates = executions[ executions.length - 1 ].aggregate_result
        db.close();
        callback( null, combine_results( aggregates ));
      }
      else{
        db.close();
        callback( null, {} );
      }
    });
  });
}

// Arrange single query combined aggregates by doctor ID
function process_results( result, toReturn ){
  // If there are results, then arrange them
  if( result[0] ){
    result.forEach( function( x ){
      var doc   = x.doctor.toString();
      var title = x.title.toString();

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
  // Receive processed query input list from query_list.js
  var titles   = require( './query_list.js' ).titles();
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

      process_results( result, bucket );

      // ...And recurse
      process_query( iterator, bucket, callback );
    });
  }
}

// Mongo find, uses query title and filter objects
module.exports = {
  executions: get_all_executions
}
