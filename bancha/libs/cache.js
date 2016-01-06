module.exports = function (app) {
  var Cacher = require('cacher');

  var MemoryCache = require('./static/memory-cache');

  var cache = new Cacher(new MemoryCache());

  cache.ignoreClientNoCache = true;

  cache.on('error', function (err) {
    console.log('Cache error', err);
  });

  cache.auto = function (req, res, next) {
    cache.noCaching = req.authenticated;

    if (cache.noCaching) {
      return next();
    }

    cache.cache('minutes', 10)(req, res, next);
  };

  cache.clear = function (next) {
    this.client.clear(next);
  };

  return cache;
};