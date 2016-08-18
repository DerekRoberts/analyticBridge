// Strict mode
"use strict";

// Requires for reading and parsing queries.json
var fs = require('fs');
var queryFile = JSON.parse(fs.readFileSync('./config/queries.json'));

/**
 * Returns a list of all query titles defined in the configuration
 * 
 * @returns {array} List of all query titles defined in the configuration
 */
var getTitles = function() {
    return Object.keys(queryFile);
};

/**
 * Scans query entries and returns the full information object of the first
 * query entry with the title passed
 * 
 * @param title
 *                {string} value of title to search for
 * @returns {string} The full information object of the first query entry with
 *          the title passed
 */
var getQueryInfo = function(title) {
    return queryFile[title];
}

/**
 * Scans query entries and returns the title of the first query entry with the
 * xml path passed
 * 
 * @param xmlPath
 *                {string} value of XML path to search for
 * @returns {string} The title of the first query entry with the xml path passed
 */
var findTitleByXmlPath = function(xmlPath) {
    var toReturn = null;
    Object.keys(queryFile).forEach(function(queryName) {
	if (queryFile[queryName].XMLPath === xmlPath) {
	    toReturn = queryName;
	    return false;
	}
    });
    return toReturn;
}

// Functions export
module.exports = {
    getTitles : getTitles,
    getQueryInfo : getQueryInfo,
    findTitleByXmlPath : findTitleByXmlPath,
};
