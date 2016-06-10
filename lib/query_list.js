var fs         = require( 'fs' );
var query_file = JSON.parse( fs.readFileSync( './config/queries.json' ));


// Return just the query titles
var titles = function (){
	return Object.keys( query_file );
};


// Scrub queries to find title with specified xml path
var findTitleByXmlPath = function( xmlPath ){
	var toReturn = null;
	Object.keys( query_file ).forEach( function( q ){
		if( query_file[ q ].xml_path === xmlPath ){
			toReturn = query_file[ q ].title;
			return false;
		}
	});
	return toReturn;
}


module.exports = {
	titles             : titles,
	findTitleByXmlPath : findTitleByXmlPath,
	raw                : query_file
};
