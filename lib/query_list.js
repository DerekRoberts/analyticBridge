var fs         = require( 'fs' );
var query_file = JSON.parse( fs.readFileSync( './queries/list.json' ));

// Return just the query titles
var titles = function (){
	var toReturn = [];
	var l = query_file.length;
	for( var i = 0; i < l; i++ ){
		toReturn.push( query_file[ i ].title );
	}
	return toReturn;
};

module.exports = {
	titles : titles,
	raw    : query_file
};
