var extend = require('extend');

var defaults = require('../config/defaults');

module.exports = function (options) {
  var env = (process.env.NODE_ENV || options.env || 'local').toLowerCase(),
      appConfig = require(options.basePath + 'config/' + env + '.json'),
      config;

  config = extend(true, defaults, appConfig, {
    options: options,
    env: env
  });

  return config;
};