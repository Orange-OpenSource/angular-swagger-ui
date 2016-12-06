/*
 * Orange angular-swagger-ui - v0.3.4
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerClient', function($q, $http, swaggerModules) {

		/**
		 * format API explorer response before display
		 */
		function formatResult(deferred, response) {
			var query = '',
				data = response.data,
				config = response.config;

			if (config.params) {
				var parts = [];
				for (var key in config.params) {
					parts.push(key + '=' + encodeURIComponent(config.params[key]));
				}
				if (parts.length > 0) {
					query = '?' + parts.join('&');
				}
			}
			deferred.resolve({
				url: config.url + query,
				response: {
					body: data ? (angular.isString(data) ? data : angular.toJson(data, true)) : 'no content',
					status: response.status,
					headers: angular.toJson(response.headers(), true)
				}
			});
		}

		/**
		 * Send API explorer request
		 */
		this.send = function(swagger, operation, values) {
			var deferred = $q.defer(),
				query = {},
				headers = {},
				path = operation.path,
				body;

			// build request parameters
			for (var i = 0, params = operation.parameters || [], l = params.length; i < l; i++) {
				//TODO manage 'collectionFormat' (csv etc.) !!
				var param = params[i],
					value = values[param.name];

				switch (param.in) {
					case 'query':
						if (!!value) {
							query[param.name] = value;
						}
						break;
					case 'path':
						var pattern = new RegExp('{' + param.name + '}', 'gi');
						path = path.replace(pattern, encodeURIComponent(value));
						break;
					case 'header':
						if (!!value) {
							headers[param.name] = value;
						}
						break;
					case 'formData':
						body = body || new FormData();
						if (!!value) {
							if (param.type === 'file') {
								values.contentType = undefined; // make browser defining it by himself
							}
							body.append(param.name, value);
						}
						break;
					case 'body':
						body = body || value;
						break;
				}
			}

			// add headers
			headers.Accept = values.responseType;
			headers['Content-Type'] = body ? values.contentType : 'text/plain';

			// build request
			var basePath = swagger.basePath || '',
				baseUrl = [
					swagger.schemes[0],
					'://',
					swagger.host,
					basePath.length > 1 && basePath.substring(basePath.length - 1) === '/' ? basePath.slice(0, -1) : basePath
				].join(''),
				options = {
					method: operation.httpMethod,
					url: baseUrl + path,
					headers: headers,
					data: body,
					params: query
				},
				callback = function(data, status, headers, config) {
					// execute modules
					var response = {
						data: data,
						status: status,
						headers: headers,
						config: config
					};
					swaggerModules
						.execute(swaggerModules.AFTER_EXPLORER_LOAD, response)
						.then(function() {
							formatResult(deferred, response);
						});
				};

			// execute modules
			swaggerModules
				.execute(swaggerModules.BEFORE_EXPLORER_LOAD, options)
				.then(function() {
					// send request
					$http(options)
						.success(callback)
						.error(callback);
				});

			return deferred.promise;
		};

	});
