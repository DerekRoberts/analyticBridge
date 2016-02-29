// Requires for general utils, file system (fs) and mongo interface
var ut = require( './lib/util.js' );
var fs = require( 'fs' );
var mi = require( './lib/mongo_interface.js' );

// Queries to include
var query_file   = JSON.parse( fs.readFileSync( './queries/list.json' ));
var query_filter = JSON.parse( '{ "title": 1, "executions": 1 }' );

// Array of titles, used to query Mongo
var query_titles = ut.grabOneField( query_file, "title" );

query_file.forEach( function( q ){
		mi.find( {title:"Test-000"}, query_filter, function( error, docs ){
		if( error ){
			console.log( error );
			process.exit( 1 );
		}
		process.exit( 0 );
	});
});
