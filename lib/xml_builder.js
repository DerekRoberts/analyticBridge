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


var parser = require('xml2json');

// Combine string and emits into regular JSON
function json_build( ar ){
  var toReturn = [];
  var keys = Object.keys( ar );

  var l = keys.length;
  var i = 0;
  for( ; i < l; i++ ){
    var json  = JSON.parse( keys[ i ]);
    var value = ar[keys[ i ]];
    console.log( ut.pretty_print(json) +" plus "+ value );
  }

  var json = "{}";
  toReturn['cpsid']=json;
}

// Mongo find by query title
var mdb = require('mongodb').MongoClient;
var uri = 'mongodb://localhost:27017/query_composer_development';
mdb.connect( uri, function( err, db ){
  if( err ){ throw new Error( err )}

  var collection = db.collection('queries');
  collection.find({},{title:1,executions:1}).toArray( function( err, docs ){
    var aggregate_result = docs[0].executions[0].aggregate_result;
    var blah   = json_build( aggregate_result );
    db.close()
  });

  //var docs = collection.find({ title: "Test-001" })
});

module.exports ={
  test:"yup, that's a test",
  json: b_json
}
