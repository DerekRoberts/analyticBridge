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
        callback( null, combine_results( aggregates ));
      }

      callback( null, {} );
      db.close();
    });
  });
}

// Arrange single query combined aggregates by doctor ID
function doc_chop( query ){
  var toReturn = {};
  var l = query.length;
  for( var i = 0; i < l ; i++ ){
    var agg = query[ i ];
    var doc = agg.doctor.toString();
    var date = agg.date.toString();

    if( ! toReturn[ doc ] ){
      toReturn[ doc ] = {};
    }
    if( ! toReturn[ doc ][ date ]){
      toReturn[ doc ][ date ]=[];
    }
    toReturn[ doc ][ date ].push( agg );
  }

  return toReturn;
}

// Mongo find for multiple queries
function get_all_executions( callback ){
  // Receive processed query input list from query_list.js
  var titles   = require( './query_list.js' ).titles();
  var toReturn = {};

  // Query for each title
  titles.forEach( function( t ){
    mongo_get( t, function( error, result ){
      if( error ){ throw new Error( error )}

      // Return results, if any
      if( result[ 0 ]){
        result = doc_chop( result );
        toReturn[ t ] = result;
      }

      // Force forEach (asynchronous) to behave synchronously
      if( t === titles[ titles.length -1 ]){
        callback( null, toReturn );
      }
    });
  });
}

// Mongo find, uses query title and filter objects
module.exports = {
  executions: get_all_executions
}
