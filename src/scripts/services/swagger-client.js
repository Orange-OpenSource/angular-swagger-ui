/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerClient', function($q, $http, $httpParamSerializer, swaggerModules) {

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
		this.send = function(openApiSpec, operation, values, securityDefinitions) {
			var deferred = $q.defer(),
				query = {},
				headers = {},
				path = operation.path,
				urlEncoded = values.contentType === 'application/x-www-form-urlencoded',
				body;

			// in case path contains request URI template (RFC-6570 https://tools.ietf.org/html/rfc6570)
			if (path.match(/.*\?.*({(\?|&).*})/)) {
				path = path.split('?')[0];
			} else if (path.match(/.*({(\?).*})/)) {
				path = path.split('{?')[0];
			}
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
						path = path.replace(new RegExp('{' + param.name + '[^}]*}'), encodeURIComponent(value));
						break;
					case 'header':
						if (!!value) {
							headers[param.name] = value;
						}
						break;
					case 'formData':
						body = body || (urlEncoded ? {} : new FormData());
						if (!!value) {
							if (param.type === 'file') {
								values.contentType = undefined; // make browser defining it by himself
							}
							if (urlEncoded) {
								body[param.name] = value;
							} else {
								body.append(param.name, value);
							}
						}
						break;
					case 'body':
						body = body || value;
						break;
				}
			}

			// authorizations
			angular.forEach(securityDefinitions, function(security) {
				if (security.valid) {
					switch (security.type) {
						case 'apiKey':
							switch (security.in) {
								case 'header':
									headers[security.name] = security.apiKey;
									break;
								case 'query':
									query[security.name] = security.apiKey;
									break;
							}
							break;
						default:
							if (security.tokenType && security.accessToken) {
								headers.Authorization = security.tokenType + ' ' + security.accessToken;
							}
							break;
					}
				}
			});

			// add headers
			headers.Accept = values.responseType;
			headers['Content-Type'] = body ? values.contentType : 'text/plain';

			// build request
			var basePath = openApiSpec.basePath || '',
				baseUrl = [
					openApiSpec.schemes[0],
					'://',
					openApiSpec.host,
					basePath.length > 0 && basePath.substring(basePath.length - 1) === '/' ? basePath.slice(0, -1) : basePath
				].join(''),
				options = {
					method: operation.httpMethod,
					url: baseUrl + path,
					headers: headers,
					data: urlEncoded ? $httpParamSerializer(body) : body,
					params: query
				},
				callback = function(result) {
					// execute modules
					var response = {
						data: result.data,
						status: result.status,
						headers: result.headers,
						config: result.config
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
						.then(callback)
						.catch(callback);
				});

			return deferred.promise;
		};

	});