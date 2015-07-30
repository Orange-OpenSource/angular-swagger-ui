/*
 * Orange angular-swagger-ui - v0.1.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerClient', ['$q', '$http', function($q, $http) {
		function formatXml(xml) {
			var formatted = '';
			var reg = /(>)(<)(\/*)/g;
			xml = xml.replace(reg, '$1\r\n$2$3');
			var pad = 0;
			angular.forEach(xml.split('\r\n'), function (node, index) {
				var indent = 0;
				if (node.match(/.+<\/\w[^>]*>$/)) {
					indent = 0;
				} else if (node.match(/^<\/\w/)) {
					if (pad != 0) {
						pad -= 1;
					}
				} else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
					indent = 1;
				} else {
					indent = 0;
				}

				var padding = '';
				for (var i = 0; i < pad; i++) {
					padding += '  ';
				}

				formatted += padding + node + '\r\n';
				pad += indent;
			});

			return formatted;
		}

		function formatResult(deferred, data, status, headers, config) {
			var query = '';
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
					body: data ? ((headers.Accept = 'application/xml') ? formatXml(data) : angular.toJson(data, true)) : 'no content',
					status: status,
					headers: angular.toJson(headers(), true)
				}
			});
		}

		this.send = function(swagger, operation, values, transform) {
			var deferred = $q.defer(),
				query = {},
				headers = {},
				path = operation.path;

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
						path = path.replace('{' + param.name + '}', encodeURIComponent(value));
						break;
					case 'header':
						if (!!value) {
							headers[param.name] = value;
						}
						break;
					case 'formData':
						values.body = values.body || new FormData();
						if (!!value) {
							if (param.type === 'file') {
								values.contentType = undefined; // make browser defining it by himself
							}
							values.body.append(param.name, value);
						}
						break;
				}
			}

			// add headers
			headers.Accept = values.responseType;
			headers['Content-Type'] = values.body ? values.contentType : 'text/plain';

			// build request
			//FIXME should use server hosting the documentation if scheme or host are not defined
			var request = {
					method: operation.httpMethod,
					url: [swagger.schemes && swagger.schemes[0] || 'http', '://', swagger.host, swagger.basePath || '', path].join(''),
					headers: headers,
					data: values.body,
					params: query
				},
				callback = function(data, status, headers, config) {
					formatResult(deferred, data, status, headers, config);
				};

			// apply transform
			if (typeof transform === 'function') {
				transform(request);
			}

			// send request
			$http(request)
				.success(callback)
				.error(callback);

			return deferred.promise;
		};

	}]);