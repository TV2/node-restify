// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

var assert = require('assert');

var d = require('dtrace-provider');
var Logger = require('bunyan');
var mime = require('mime');

var clients = require('./clients');
var errors = require('./errors');
var plugins = require('./plugins');
var Request = require('./request');
var Response = require('./response');
var Server = require('./server');



///--- Globals

var DTRACE;

var HttpClient = clients.HttpClient;
var JsonClient = clients.JsonClient;
var StringClient = clients.StringClient;



///--- Helpers

function bunyanResponseSerializer(res) {
  assert.ok(res);

  return {
    statusCode: res.statusCode,
    headers: res.headers
  };
}


function bunyanClientRequestSerializer(req) {
  assert.ok(req);

  return {
    method: req.method,
    path: req.path,
    host: req.host,
    port: req.port,
    headers: req.headers
  };
}


function logger(log, name) {
  if (log) {
    return log.child({
      serializers: {
        err: Logger.stdSerializers.err,
        req: Logger.stdSerializers.req,
        res: bunyanResponseSerializer,
        client_req: bunyanClientRequestSerializer
      }
    });
  }

  return new Logger({
    level: 'warn',
    service: name,
    stream: process.stderr,
    serializers: {
      err: Logger.stdSerializers.err,
      req: Logger.stdSerializers.req,
      res: bunyanResponseSerializer
    }
  });
}


function defaultDTrace(name) {
  if (!DTRACE)
    DTRACE = d.createDTraceProvider(name);

  return DTRACE;
}


///--- Exported API

module.exports = {

  bunyan: {
    serializers: {
      response: bunyanResponseSerializer
    }
  },

  createServer: function createServer(options) {
    if (!options)
      options = {};
    if (!options.name)
      options.name = 'restify';
    if (!options.dtrace)
      options.dtrace = defaultDTrace(options.name);

    options.log = logger(options.logger, options.name);

    return new Server(options);
  },


  createClient: function createClient(options) {
    if (typeof(options) !== 'object')
      throw new TypeError('options (Object) required');

    if (!options.name)
      options.name = 'restify';
    if (!options.type)
      options.type = 'application/octet-stream';
    if (!options.dtrace)
      options.dtrace = defaultDTrace(options.name);

    options.log = logger(options.logger, options.name);

    var client;
    switch (options.type) {
    case 'json':
      client = new JsonClient(options);
      break;

    case 'string':
      client = new StringClient(options);
      break;

    case 'http':
    default:
      client = new HttpClient(options);
      break;
    }

    return client;
  },


  createJsonClient: function createJsonClient(options) {
    if (typeof(options) !== 'object')
      throw new TypeError('options (Object) required');

    options.type = 'json';
    return module.exports.createClient(options);
  },


  createStringClient: function createStringClient(options) {
    if (typeof(options) !== 'object')
      throw new TypeError('options (Object) required');

    options.type = 'string';
    return module.exports.createClient(options);
  },


  HttpClient: HttpClient,
  JsonClient: JsonClient,
  StringClient: StringClient,

  Request: Request,
  Response: Response,
  Server: Server
};


Object.keys(errors).forEach(function(k) {
  module.exports[k] = errors[k];
});

Object.keys(plugins).forEach(function(k) {
  module.exports[k] = plugins[k];
});

module.exports.__defineSetter__('defaultResponseHeaders', function(f) {
  if (f === false || f === null || f === undefined) {
    f = function() {};
  } else if (f === true) {
    return;
  } else if (typeof(f) !== 'function') {
    throw new TypeError('defaultResponseHeaders must be a function');
  }

  Response.prototype.defaultHeaders = f;
});