// Requires for general utils and mongo interface
var ut = require( './lib/util.js' );
var mi = require( './lib/mongo_interface.js' );
var xb = require( './lib/xml_builder.js' );

// Receive processed query input list from query_list.js
var query_list = require( './lib/query_list.js' );
var titles     = query_list.titles();

// Receive processed query input list from query_list.js
var doctor_list = require( './lib/doctor_list.js' );
var doctors     = doctor_list.doctors();

// XML array, to process
var toExport = doctors;

// Replace PDC queries to pre-format as HDC/AMCARE queries

// ToDo: Export toExport
