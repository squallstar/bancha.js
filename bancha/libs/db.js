var mongo = require('mongoskin');

module.exports = function (app) {
  var config = app.config,
      schema = app.schema;

  // -------------------------------------------------------
  // DB Connection
  var db = mongo.db(config.database, { native_parser:true });

  // -------------------------------------------------------
  // Common Helpers
  db.id = mongo.helper.toObjectID;

  // -------------------------------------------------------

  schema.forEach(function (s) {
    var collectionName = s.collectionName,
        schemaName = s.name;

    db.bind(collectionName);

    var collectionDb = db[collectionName];

    s.collection = collectionDb;

    collectionDb.dropIndexes(function () {
      collectionDb.ensureIndex({ schema: 1 });
      collectionDb.ensureIndex({
        order: 1, updated_at: -1
      });
    });

    collectionDb.get = function (req, next) {
      var query = {};

      if (!req.skip_schema) {
        query.schema = schemaName;
      }

      if (!req.authenticated) {
        query.published = true;
      }

      var cursor = this.find(query).sort({ order: 1, updated_at: -1 });

      if (typeof next === 'function') {
        cursor.toArray(next);
      }

      return cursor;
    };
  });

  // -------------------------------------------------------

  db.bind('attachments');

  db.attachments.ensureIndex({ created_at: -1 });

  // -------------------------------------------------------

  return db;
};