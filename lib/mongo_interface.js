// Requires
var mongodb = require('mongodb');
var uri = 'mongodb://localhost:27017/query_composer_development';

// 
exports.find = function( title, filter, callback ){
  mongodb.MongoClient.connect( uri, function( error, db ){
    if( error ){
      process.exit( 1 );
    }
    // Create JSON sort, e.g. { sortBy: 1 }
    var sort = Object.keys( title );
    sort = JSON.parse( '{ "'+ sort[0] +'" : 1 }' );

    db.collection( 'queries' ).find( title, filter ).sort( sort ).toArray( function( error, docs ){
      if( error ){
        process.exit( 1 );
      }
      callback( null, docs );
    });
  });
};
