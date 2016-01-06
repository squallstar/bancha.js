var _ = require('lodash');
var async = require('async');
var express = require('express');
var gm = require('gm');

module.exports = function (app) {
  var router = express.Router();

  var bucket = app.bucket;
  var cache = app.cache;
  var db = app.db;
  var schema = app.schema;

  var helpers = require('../../libs/static/helpers');
  var multipart = require('../../libs/static/multipart');

  // -------------------------------------------------------

  router.use(function (req, res, next) {
    cache.clear(next);
  });

  // -------------------------------------------------------

  router.param('schema', schema.connect);

  // -------------------------------------------------------

  router.param('id', function (req, res, next, id) {
    req.schema.collection.findById(id, function (err, record) {
      if (err || !record) {
        return res.redirect('/');
      }

      req.record = record;
      next();
    });
  });

  // -------------------------------------------------------

  router.get('/', function (req, res) {
    res.cookie('logged', true);
    res.redirect('/');
  });

  // -------------------------------------------------------

  router.get('/logout', function (req, res) {
    res.clearCookie('logged');
    res.redirect('/');
  });

  // -------------------------------------------------------

  router.post('/create/:schema', function (req, res) {
    var data = {
      schema: req.schema.name,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    req.schema.fields.forEach(function (field) {
      if (field.default) {
        data[field.name] = typeof field.default === 'function' ? field.default() : field.default;
      }
    });

    req.schema.collection.count(function (err, count) {
      count++;

      data.title = 'Untitled ' + req.schema.name + ' ' + count;
      data.slug = req.schema.name + '-' + count;

      req.schema.collection.insert(data, function () {
        res.redirect('/admin/edit/' + req.schema.name + '/' + data._id.toString());
      });
    });
  });

  // -------------------------------------------------------

  router.post('/delete/:schema/:id', function (req, res) {
    var id = req.params.id;

    req.schema.collection.removeById(id, function () {
      res.redirect('/' + req.schema.url);
    });
  });

  // -------------------------------------------------------

  router.post('/publish/:schema/:id', function (req, res) {
    var id = req.params.id;

    req.schema.collection.updateById(id, {
      $set: { published: true }
    }, function () {
      res.redirect(req.header('Referer'));
    });
  });

  // -------------------------------------------------------

  router.post('/unpublish/:schema/:id', function (req, res) {
    var id = req.params.id;

    req.schema.collection.updateById(id, {
      $set: { published: false }
    }, function () {
      res.redirect(req.header('Referer'));
    });
  });

  // -------------------------------------------------------

  router.get('/edit/:schema/:id', function (req, res) {
    res.render('core/edit-record', {
      schema: req.schema,
      record: req.record
    });
  });

  // -------------------------------------------------------

  router.post('/edit/:schema/:id', multipart);

  router.post('/edit/:schema/:id', function (req, res) {
    var data = req.body;
    data.updated_at = Date.now();

    req.schema.fields.forEach(function (field) {
      if (!data[field.name]) {
        return;
      }

      if (field.trim === true) {
        data[field.name] = (typeof data[field.name] === 'string' ? data[field.name] : '').trim()
      }
    });

    // Cleanup slug
    data.slug = helpers.parametrize(data.slug);

    if (req.schema.hooks && typeof req.schema.hooks.beforeUpdate === 'function') {
      req.schema.hooks.beforeUpdate(data);
    }

    req.schema.collection.updateById(req.record._id, {
      $set: data
    }, function (err) {
      if (err) {
        return res.render('error', {
          message: 'Cannot save',
          error: err
        });
      }

      res.redirect('/' + req.schema.url + '/' + data.slug);
    });
  });

  // -------------------------------------------------------

  router.post('/upload-image/:schema', multipart);
  router.post('/upload-image/:schema', uploadImage);

  router.post('/upload-image/:schema/:id', multipart);
  router.post('/upload-image/:schema/:id', uploadImage);

  function uploadImage (req, res) {
    var image = req.body.image,
        schema = req.schema,
        fieldName = req.query.field,
        folder = schema ? schema.name : 'generic',
        data = {
          ACL: 'public-read',
          Key: 'images/' + folder + '/' + Date.now() + '-' + helpers.parametrize(image.fileName),
          ContentType: image.contentType,
          Body: image.contents
        },
        resourceUrl = bucket.url(data.Key);

    async.waterfall([
      function (next) {
        if (!schema || !fieldName) {
          return next();
        }

        var field = _.find(schema.fields, function (field) {
              return field.name === fieldName;
            }),
            resize = field ? field.resize : null,
            fileNamePieces = image.fileName.split('.'),
            extension = fileNamePieces[fileNamePieces.length -1].toUpperCase();

        if (!resize) {
          return next();
        }

        gm(data.Body, image.fileName)
        .quality(90)
        .resize(resize[0], resize[1], '^')
        .toBuffer(extension, function (err, buffer) {
          if (err) {
            return next(err);
          }

          switch (extension) {
            case 'JPG':
              data.ContentType = 'image/jpeg';
              break;
            default:
              data.ContentType = 'image/' + extension.toLowerCase();
          }

          data.Body = buffer;
          next();
        });
      },
      function (next) {
        bucket.putObject(data, function (err) {
          next(err);
        });
      },
      function (next) {
        // In background, push the attachment to the collection
        db.attachments.insert({
          type: 'image',
          schema: schema ? schema.name : null,
          url: resourceUrl,
          created_at: Date.now(),
          field: fieldName || null,
          record: req.record ? req.record._id : null
        });

        if (!schema || !fieldName || !req.record) {
          return next();
        }

        var obj = {};
        obj[fieldName] = resourceUrl;

        // Push the image to the record
        req.schema.collection.updateById(req.record._id, { $push: obj }, function (err) {
          next(err);
        });
      }
    ], function (err) {
      if (err) {
        return res.status(400).send({ error: err });
      }

      res.status(201).send({
        location: bucket.url(data.Key)
      });
    });
  }

  // -------------------------------------------------------

  router.post('/delete-image/:schema/:id', function (req, res) {
    var url = req.body.url,
        partialUrl = url.replace(bucket.url(), '');

    bucket.deleteObject({ Key: partialUrl }, function (err) {
      if (err) {
        return res.status(400).send({ error: err });
      }

      var obj = {};
      obj[req.query.field] = url;

      req.schema.collection.updateById(req.record._id, { $pull: obj }, function (err) {
        res.send();
      });
    });
  });

  // -------------------------------------------------------

  router.get('/attachments', function (req, res) {
    db.attachments.find().sort({ created_at: -1 }).toArray(function (err, attachments) {
      res.render('core/list-attachments', {
        attachments: attachments
      })
    });
  });

  // -------------------------------------------------------

  router.post('/attachments/delete/:attachment', function (req, res) {
    var id = req.params.attachment;

    db.attachments.findById(id, function (err, attachment) {
      if (err || !attachment) {
        return res.render('not-found');
      }

      bucket.deleteObject({
        Key: attachment.url.replace(bucket.url(), '')
      }, function (err) {
        if (err) {
          return res.render('error', {
            message: err.message || 'Could not delete S3 attachment from bucket',
            error: err
          });
        }

        db.attachments.removeById(id, function () {
          res.redirect(req.header('Referer'));
        });
      });
    });
  });

  // -------------------------------------------------------

  router.post('/sort/:schema', function (req, res) {
    var records = req.body.records,
        i = 0;

    async.eachLimit(records, 5, function (record, next) {
      req.schema.collection.updateById(record, { $set: { order: i++ } }, next);
    }, function (err) {
      if (err) {
        return res.status(400).send({ error: err });
      }

      res.status(200).send();
    });
  });

  // -------------------------------------------------------

  return router;
}