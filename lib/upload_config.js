// Strict mode
"use strict";


var fs         = require( 'fs' );
var upload_config_file = JSON.parse( fs.readFileSync( './config/upload.json' ));

// Return just the query titles
var uploadConfig = function (){
	return Object.keys( upload_config_file );
};

module.exports = {
	uploadConfig : uploadConfig,
	raw    : upload_config_file
};
