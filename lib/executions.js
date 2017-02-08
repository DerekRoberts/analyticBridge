// Strict mode
"use strict";


// Requires for MongoDB and query titles 
var mdb = require('mongodb').MongoClient;
var queries = require( './queries.js' );
var connectionsConfig = require('./connections.js');

/**
 * Pulls a object that contains all the executions for all queries in the config
 * file from the database.
 * 
 * @param callback
 *                {function(error, data)} Callback to be called and passed error
 *                or null and the object containing the data pulled
 */
function getAllData( callback ){
  var toReturn = {};

  // Pass titles as static key/pair object (consistency + functions)
  iterateQueries( queries.getTitles().entries(), toReturn, callback);
}

/**
 * Recursive helper function to getAllData that cycles through the list of
 * queries recursively to allow for an asyncronous callback for each query
 * 
 * @param iterator
 *                {iterator} Iterator object to use for obtaining the next query
 *                title
 * @param bucket
 *                {object} Bucket to add results to by query title
 * @param callback
 *                {function(error, data)} Callback to be called when all queries
 *                have compeleted and pass error or null and the object
 *                containing the data pulled
 */
function iterateQueries( iterator, bucket, callback ) {
    var title = iterator.next();

    if( title.done === true ){
     // Callback when done (no next object)
     callback( null, bucket );
    }
    else {
	// ...Otherwise query for the title (0 = key, 1 = value)
        getDataByTitle( title.value[1], function( error, result ){
       if( error ){ throw new Error( error )}
    
       bucket[title.value[1]] = result;
    
       // Recurse for next query
       iterateQueries( iterator, bucket, callback );
     });
    }
}

/**
 * Pulls the data for the query with the title passed from the database.
 * 
 * @param queryTitle
 *                {string} title of the query for which to pull data
 * @param callback
 *                {function(error, result)} Callback to be called and passed
 *                error or null and the object containing the data pulled
 */
function getDataByTitle( queryTitle, callback ){
    // Mongo setup
    var uri = connectionsConfig.getDatabase().uri;
    var documentTitle  = connectionsConfig.getDatabase().title;
    // filter to query title being requested 
    documentTitle.title = queryTitle;
    var filter = connectionsConfig.getDatabase().filter

    // Connect to Mongo, requires MONGO.close() later
    mdb.connect( uri, function( error, db ){
      if( error ){ throw new Error( error )}

      // Collection and command passing for single Mongo query
      db.collection(connectionsConfig.getDatabase().collection)
      .find( documentTitle, filter ).toArray( function( error, documents ){
        if( error ){ throw new Error( error )}
        // See if there is a result for the query title
        var executions
        if( documents.length > 0){
            // there should only be at most one result per query title
            if (documents.length > 1) {
        	throw new Error( documents.length + " documents returned when querying by document title " 
        		+ documentTitle);
            }
            
            executions = documents[0].executions;
        } else {
            // no data available
            executions = null;
        }
        
        // Close DB connection and return results
        db.close();
        callback( null, executions );

      });
    });
  }

/**
 * Returns an array containing the titles of all queries that have resutls data available for them.
 * 
 * @param callback {function} Callback function to be called upon completion
 */
function getAllQueriesWithResults( callback ){
	// Mongo setup
	var uri = connectionsConfig.getDatabase().uri;
	var filter = connectionsConfig.getDatabase().filter

	// Connect to Mongo, requires MONGO.close() later
	mdb.connect(uri, function(error, db) {
		if (error) {
			throw new Error(error)
		}

		// Documents in the quereis collection that have an "executions" member
		db.collection(connectionsConfig.getDatabase().collection).find({
			"executions" : {
				"$exists" : true
			}
		}, filter).toArray(function(error, documents) {
			if (error) {
				throw new Error(error)
			}

			// Build list of query titles
			var titles = [];
			documents.forEach(function(doc) {
				titles.push(doc.title)
			});
			titles.sort();

			// Close DB connection and return results
			db.close();
			callback(null, titles);

		});
	});

}


// Mongo find, uses query title and filter objects
module.exports = {
  getAllData : getAllData,
  getAllQueriesWithResults : getAllQueriesWithResults,
  getDataByTitle : getDataByTitle
}
