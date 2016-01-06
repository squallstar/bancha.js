/*
@package   Soba
@author    Nicholas Valbusa
@copyright Soba 2016(C)

---------------------------

Express index router

*/

var async = require('async');
var express = require('express');

module.exports = function Router (app) {
  var router = express.Router();

  var schema = app.schema;

  // -------------------------------------------------------

  router.param('schema', schema.connect);

  // -------------------------------------------------------

  router.get('/', function (req, res) {
    async.parallel([
      function (next) {
        req.skip_schema = true;
        schema.get('work').collection.get(req).limit(20).toArray(next);
      }
    ], function (err, results) {
      res.render('home', {
        records: results[0]
      });
    });
  });

  // -------------------------------------------------------

  router.get('/:schema/:slug', viewRecord);
  router.get('/:slug', viewRecord);

  function viewRecord (req, res, next) {
    if (!req.schema) {
      req.schema = schema.get('pages');
    }

    req.schema.collection.findOne({ slug: req.params.slug }, function (err, record) {
      if (err || !record) {
        return next();
      }

      var data = {
        title: record.title,
        record: record,
        actions: schema.actionsForRecord(req.schema, record)
      };

      data[req.schema.name] = record;

      res.render(req.schema.url + '/' + req.schema.name, data);
    });
  }

  // -------------------------------------------------------

  router.get('/:schema', function (req, res, next) {
    if (!req.schema) {
      return next();
    }

    req.schema.collection.get(req, function (err, records) {
      res.render(req.schema.url + '/' + req.schema.url, {
        records: records,
        actions: [
          {
            title: 'Add new ' + req.schema.name,
            url: '/admin/create/' + req.schema.name
          }
        ]
      });
    });
  });

  return router;
};