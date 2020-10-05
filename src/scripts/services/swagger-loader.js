/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerLoader', function($q, $http, swaggerModules) {

		this.get = function(data) {
			var deferred = $q.defer(),
				options = {
					method: 'GET',
					url: data.url
				};

			swaggerModules
				.execute(swaggerModules.BEFORE_LOAD, options)
				.then(function() {
					return $http(options);
				})
				.then(function(response) {
					data.openApiSpec = response.data;
					data.contentType = (response.headers()['content-type'] || 'application/json').split(';')[0];
					return swaggerModules.execute(swaggerModules.AFTER_LOAD, data);
				})
				.then(function() {
					deferred.resolve(data);
				})
				.catch(function(error) {
					if (error.status) {
						error = {
							code: error.status,
							message: error.data
						};
					}
					deferred.reject(error);
				});

			return deferred.promise;
		};

	});