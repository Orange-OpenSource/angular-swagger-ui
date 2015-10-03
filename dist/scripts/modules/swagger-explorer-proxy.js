'use strict'

angular
  .module('swaggerUi')
  .service('swaggerExplorerProxy', ['$q', function ($q) {
    /**
     * Module entry point
     */
    this.execute = function (options) {
      var deferred = $q.defer()
      options.originalUrl = options.url
      options.url = (this.proxyUrl || '') + options.url
      deferred.resolve(true)
      return deferred.promise
    }
	}])