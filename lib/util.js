// Strict mode
"use strict";


/**
 * Outputs a well formatted version the object passed to console.log
 * 
 *  @param json {object} object to output
 */
exports.pp = function( json ){
	console.log( JSON.stringify( json, null, '\t' ));
}
