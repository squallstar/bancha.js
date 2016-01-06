var cache = require('memory-cache');

function MemoryCache() {}

MemoryCache.prototype.get = function (key, cb) {
  cb(null, cache.get(key));
};

MemoryCache.prototype.set = function (key, cacheObj, ttl, cb) {
  cache.put(key, cacheObj, ttl*1000);

  if (cb) {
    return cb();
  }
};

MemoryCache.prototype.invalidate = function (key, cb) {
  cache.del(key);

  if (cb) {
    return cb();
  }
};

MemoryCache.prototype.clear = function (cb) {
  cache.clear();

  if (cb) {
    return cb();
  }
};

module.exports = MemoryCache;