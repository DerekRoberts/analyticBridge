// Strict mode
"use strict";


// Requires for reading and parsing queries.json
var fs         = require( 'fs' );
var query_file = JSON.parse( fs.readFileSync( './config/queries.json' ));


// Return just the query titles
var titles = function (){
	return Object.keys( query_file );
};


// Scrub queries to find title with specified xml path
var findTitleByXmlPath = function( xmlPath ){
	var toReturn = null;
	Object.keys( query_file ).forEach( function( queryName ){
		if( query_file[ queryName ].xml_path === xmlPath ){
			toReturn = queryName;
			return false;
		}
	});
	return toReturn;
}


// Functions export
module.exports = {
	titles             : titles,
	findTitleByXmlPath : findTitleByXmlPath,
	raw                : query_file
};
