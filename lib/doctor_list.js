var fs         = require( 'fs' );
var doctor_file = JSON.parse( fs.readFileSync( './config/doctors.json' ));

// Return just the query titles
var doctors = function (){
	var toReturn = [];
	var l = doctor_file.length;
	for( var i = 0; i < l; i++ ){
		toReturn.push( doctor_file[ i ].doctor );
	}
	return toReturn;
};

module.exports = {
	doctors : doctors,
	raw    : doctor_file
};
