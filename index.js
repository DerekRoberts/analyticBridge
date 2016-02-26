// Utility functions
var ut = require('./lib/util.js');

// Queries to include
var queries = require( './queries/list.json' );

// MongoDB
var mongodb = require( 'mongodb' );
var uri    = 'mongodb://localhost:27017/query_composer_development';
var query = { title: "Test-001" };


// Test query
mongodb.MongoClient.connect( uri, function( error, db ){
	if( error ){
		console.log( error );
		process.exit( 1 );
	}

	db.collection( 'queries' ).find( queries, { title: 1, executions: 1 }).toArray( function( error, docs ){
		if( error ){
			console.log( error );
			process.exit( 1 );
		}

		console.log( 'Results:' );
		docs.forEach( function( doc ){
			console.log( ut.pretty_print( doc ));
			console.log( "---" );
		});
		process.exit( 0 );
	});
});
