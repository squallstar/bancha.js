var _ = require('lodash');
var fs = require('fs');

var helpers = require('./static/helpers');

module.exports = function (app) {
  const SCHEMAS_PATH = app.config.options.schemasPath;

  if (!SCHEMAS_PATH) {
    throw new Error('schemasPath must be given in the options');
  }

  var Schema = [];
  var files = fs.readdirSync(SCHEMAS_PATH);

  files.forEach(function (file) {
    Schema.push(require(SCHEMAS_PATH + file)({
      helpers: helpers
    }));
  });

  // -------------------------------------------------------

  Schema.get = function (schemaName) {
    return _.find(Schema, function (s) {
      return s.url === schemaName || s.name === schemaName;
    });
  };

  // -------------------------------------------------------

  Schema.actions = Schema.map(function (schema) {
    return {
      title: helpers.capitalize(schema.name) + 's',
      url: '/' + schema.url,
      method: 'get'
    }
  });

  Schema.actions.push({
    title: 'Attachments',
    url: '/admin/attachments',
    method: 'get'
  });

  // -------------------------------------------------------

  Schema.actionsForRecord = function (schema, record) {
    var uri = schema.name + '/' + record._id,
        actions = [
          {
            title: 'Edit',
            url: '/admin/edit/' + uri,
            method: 'get'
          }
        ];

    if (record.published) {
      actions.push({ title: 'Unpublish', url: '/admin/unpublish/' + uri });
    } else {
      actions.push({ title: 'Publish', url: '/admin/publish/' + uri });
    }

    actions.push({ title: 'Delete', url: '/admin/delete/' + uri, warning: true });

    return actions;
  };

  Schema.connect = function (req, res, next, schemaName) {
    req.schema = Schema.get(schemaName);

    if (!req.schema) {
      return res.render('not-found');
    }

    next();
  };

  return Schema;
};