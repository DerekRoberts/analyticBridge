var fs         = require( 'fs' );
var query_file = JSON.parse( fs.readFileSync( './config/queries.json' ));

// Return just the query titles
var titles = function (){
	return Object.keys( query_file );
};

module.exports = {
	titles : titles,
	raw    : query_file
};
