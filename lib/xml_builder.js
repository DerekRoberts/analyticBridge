// General utility
var ut = require( './util.js' );

// Receive processed query input list from query_list.js
var doctor_list = require( './doctor_list.js' );
var raw         = doctor_list.raw;

// Receive processed query input list from query_list.js
var query_list = require( './query_list.js' );
var titles     = query_list.titles();

// Base to build XML on
var b_json = [];
raw.forEach( function( r ){
  b_json[ r.pid ]= r;
});

console.log( "\n\n\n\n\n" );

// Requires
var parser = require('xml2json');
var traverse = require('traverse');

// Combine JSON strings and values to create single objects
function combine_results( raw_aggregate_results ){
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

// Mongo find by query title
var mdb = require('mongodb').MongoClient;
var uri = 'mongodb://localhost:27017/query_composer_development';
mdb.connect( uri, function( err, db ){
  if( err ){ throw new Error( err )}

  var title  = { title: "PatientCounts" };
  var filter = { title: 1, executions: 1 };

  var collection = db.collection('queries');
  collection.find( title, filter ).toArray( function( err, docs ){

    var aggregate_result = docs[0].executions[0].aggregate_result;
    var aggregate_object = combine_results( aggregate_result );
    console.log( aggregate_object );
    db.close()
  });
});

module.exports ={
  test:"yup, that's a test",
  json: b_json
}
