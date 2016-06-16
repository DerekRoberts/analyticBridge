// Strict mode
"use strict";


// Pretty print function
exports.pp = function( json ){
	console.log( JSON.stringify( json, null, '\t' ));
}
