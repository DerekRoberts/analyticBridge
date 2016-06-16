// Strict mode
"use strict";


var fs          = require( 'fs' );
var doctor_file = JSON.parse( fs.readFileSync( './config/doctors.json' ));

// Return just the query titles
var doctors = function (){
	return Object.keys( doctor_file );
};

module.exports = {
	doctors : doctors,
	raw     : doctor_file
};
