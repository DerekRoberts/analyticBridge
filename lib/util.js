// Pretty print function
exports.pretty_print = function( json ){
	return JSON.stringify( json, null, '\t' );
}

// Filter an arary of JSON objects down to a single key
exports.grabOneField = function ( arrayOfObjects, key ){
	var toReturn = [];
	for( var i = 0; i < arrayOfObjects.length; i++ ){
		toReturn.push( arrayOfObjects[i].title );
	}
	console.log( toReturn );
	return toReturn;
}
