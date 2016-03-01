// Requires for general utils and mongo interface
var ut = require( './lib/util.js' );
var mi = require( './lib/mongo_interface.js' );

// Receive processed query input list from query_list.js
var query_list = require( './lib/query_list.js' );
var titles     = query_list.titles();

// Receive processed query input list from query_list.js
var doctor_list = require( './lib/doctor_list.js' );
var doctors     = doctor_list.doctors();

// Fields to return
var filter = JSON.parse( '{ "title": 1, "executions": 1 }' );

// XML array, to process
var toExport = [];

// Collect query resuts
var l = titles.length;
for( var i = 0; i < l; i++ ){
	var title = JSON.parse( '{ "title" : "'+ titles[ i ] +'" }' );
	mi.find( title, filter, function( error, docs ){
		if( error ){
			console.log( error );
			process.exit( 1 );
		}
		toExport.push( docs );
		console.log( toExport );
	});
}
