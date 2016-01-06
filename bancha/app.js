/*
@package   Soba
@author    Nicholas Valbusa
@copyright Soba 2015(C)

---------------------------

Application bootstrap file

- Does NOT run a server.

*/

// core libs
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var busboy = require('connect-busboy');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var moment = require('moment');
var helmet = require('helmet');
var AWS = require('aws-sdk');

// framework libs
var Config = require('./libs/config');
var Cache = require('./libs/cache');
var Db = require('./libs/db');
var Schema = require('./libs/schema');

function App(options) {

  var app = express();

  // config
  var config = Config(options);
  app.config = config;

  // framework libs
  var schema = Schema(app);
  app.schema = schema;

  var cache = Cache(app);
  app.cache = cache;

  var db = Db(app);
  app.db = db;

  // promises for everybody!
  require("native-promise-only");

  // AWS config
  AWS.config.update({
    accessKeyId: config.amazon.consumer_key,
    secretAccessKey: config.amazon.consumer_secret,
    region: config.amazon.region
  });

  // view engine setup
  app.set('views', path.join(__dirname, 'views', options.viewsPath));
  app.set('view engine', 'jade');
  app.locals.build = Math.round(Date.now()/1000);
  app.locals.moment = moment;

  // admin paths basic authentication
  var httpAuth = require('http-auth');
  var basic = httpAuth.basic({realm: 'Admin'}, function (username, password, next) {
    next(username === config.admin.username && password === config.admin.password);
  });

  // pretty views on local
  if(config.env == 'local') {
    app.locals.pretty = true;
    app.disable('view cache');
  }

  app.disable('x-powered-by');
  app.disable('etag');

  app.use(logger('dev'));
  app.use(favicon(options.publicPath + 'favicon.ico'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(helmet());
  app.use(busboy());
  app.use(express.static(options.viewsPath, {
    maxage: '1h'
  }));

  var basicAuth = httpAuth.connect(basic);

  app.use(function (req, res, next) {
    if (!req.cookies.logged && req.originalUrl.indexOf('/admin') === -1) {
      return next();
    }

    basicAuth(req, res, function () {
      req.authenticated = true;
      res.locals.authenticated = req.authenticated;
      res.locals.actions = schema.actions;
      next();
    });
  });

  // admin routes
  app.use('/admin', require('./routes/admin/index')(app));

  // website routes
  app.use('/', cache.auto, require('./routes/index')(app));

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  return app;
}

module.exports = App;