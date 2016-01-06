var AWS = require('aws-sdk');

module.exports = function (app) {
  var cfg = app.config.amazon;
  var bucket = new AWS.S3({ params: { Bucket: cfg.bucket }});

  bucket.url = function (filename) {
    return 'https://s3-' + cfg.region + '.amazonaws.com/' + cfg.bucket + '/' + (filename || '');
  };

  return bucket;
};