//Strict mode
"use strict";

var fs = require('fs');
var connectionsConfigFile = JSON.parse(fs
	.readFileSync('./config/connections.json'));

/**
 * Returns an object that contains the information for connecting to the hQuery
 * database
 * 
 * @returns {object} An object that contains the information for connecting to
 *          the hQuery database
 */
var getDatabase = function() {
    return connectionsConfigFile.database;
};

/**
 * Returns an object that contains the information for uploading scorecards to
 * the HDC central server
 * 
 * @returns {object} an object that contains the information for uploading
 *          scorecards to the HDC central server
 */
var getUpload = function() {
    return connectionsConfigFile.upload;
};

module.exports = {
    getDatabase : getDatabase,
    getUpload : getUpload
};
