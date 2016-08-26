var Client  = require('node-rest-client').Client;
var client  = new Client();
var q       = require('q');
var _       = require('lodash');
var logger  = require('winston');
var paths   = require('../paths.js');
var ConnectorClient = require('../services/connector_client.js').ConnectorClient;
var headers = { "Accept": "application/json" };

module.exports = function() {
  'use strict';

  var searchUrl = function(accountID, filters){
    var connector = new ConnectorClient(process.env.CONNECTOR_URL);
    return connector.withSearchTransactionsUrl(accountID, filters);
  },

  search = function(accountID, filters){
    var defer = q.defer();
    var url = searchUrl(accountID, filters);
    client.get(url, { headers: headers }, function(data, response) {
      successfulSearch(data, response, defer);
    }).on('error',function(err){
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  successfulSearch = function(data, response, defer) {
    var error = response.statusCode !== 200;
    if (error) return defer.reject(new Error('GET_FAILED'));
    defer.resolve(data);
  },


  searchAll = function(accountID, filters){
    var defer = q.defer();
    var results = [];
    var entryUrl = searchUrl(accountID, _.omit(filters, ['pageSize', 'page']) );
    var success = function(){ defer.resolve({results: results }); }

    var recursiveRetrieve = function(url){
      client.get(url, { headers: headers }, function(data, response) {
        var error = response.statusCode !== 200;
        if (error) return defer.reject(new Error('GET_FAILED'));
        results = results.concat(data.results);

        var next = _.get(data, "_links.next_page");
        if (next === undefined) return success();

        recursiveRetrieve(next.href);

      }).on('error',function(err){
        clientUnavailable(err, defer);
      });
    };
    recursiveRetrieve(entryUrl);
    return defer.promise;
  },

  clientUnavailable = function(error, defer) {
    logger.error('Calling connector to search transactions for an account threw exception -', {
      service: 'connector',
      method: 'GET',
      error: error
    });
    defer.reject(new Error('CLIENT_UNAVAILABLE'), error);
  };

  return {
    search: search,
    searchAll: searchAll
  };
}();