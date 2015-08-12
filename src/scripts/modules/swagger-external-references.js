/*
 * Orange angular-swagger-ui - v0.2
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerUiExternalReferences', ['$http', '$q', 'swaggerModules', function($http, $q, swaggerModules) {

		var url,
			deferred,
			swagger;

		this.execute = function(swaggerUrl, swaggerData) {
			url = swaggerUrl;
			swagger = swaggerData;
			deferred = $q.defer();
			loadExternalReferences();
			return deferred.promise;
		};

		function onError(error) {
			deferred.reject(error);
		}

		function get(externalUrl, callback) {
			var options = {
				method: 'GET',
				url: externalUrl
			};
			swaggerModules
				.execute(swaggerModules.BEFORE_LOAD, options)
				.then(function() {
					$http(options)
						.success(callback)
						.error(function(data, status) {
							onError({
								message: data,
								code: status
							});
						});
				})
				.catch(onError);
		}

		function getExternalUrl($ref) {
			var parts = $ref.split('#/'),
				externalUrl = parts[0];

			if (externalUrl.indexOf('http') !== 0 && externalUrl.indexOf('https') !== 0) {
				// relative url
				if (externalUrl.indexOf('/') === 0) {
					var swaggerUrlParts = URL.parse(url);
					externalUrl = swaggerUrlParts.protocol + '//' + swaggerUrlParts.host + externalUrl;
				} else {
					var pos = url.lastIndexOf('/');
					externalUrl = url.substring(0, pos) + '/' + externalUrl;
				}
			}
			return externalUrl;
		}

		function loadExternalReferences() {

			var loading = 0;

			function loadOperations(path) {
				loading++;
				get(getExternalUrl(path.$ref), function(json) {
					loading--;
					delete path.$ref;
					for (var key in json) {
						path[key] = json[key];
					}
					if (loading === 0) {
						loadExternalDefinitions();
					}
				});
			}

			for (var path in swagger.paths) {
				var path = swagger.paths[path];
				if (isExternal(path)) {
					loadOperations(path);
				}
			}
			if (loading === 0) {
				// may have no external paths
				loadExternalDefinitions();
			}
		}

		function isExternal(item) {
			return item && item.$ref && item.$ref.indexOf('#/') !== 0;
		}

		function loadExternalDefinitions() {
			var loading = 0,
				loadingUrls = {};

			function loadDefinitions(item) {
				var parts = item.$ref.split('#/'),
					externalUrl = getExternalUrl(item.$ref);

				if (!loadingUrls[externalUrl]) {
					loading++;
					loadingUrls[externalUrl] = true;
					get(externalUrl, function(json) {
						for (var key in json) {
							swagger.definitions[parts[0] + '#/' + key] = json[key];
							for (var attrName in json[key]) {
								var attr = json[key][attrName];
								if (attr.parameters || attr.responses) {
									// this is an external operation definition
									// check if external references
									checkOperationDefinitions(attr);
									// rewrite internal references
									for (var j = 0, params = attr.parameters || [], k = params.length; j < k; j++) {
										rewriteReference(params[j], parts[0]);
									}
									for (var code in (attr.responses || {})) {
										rewriteReference(attr.responses[code], parts[0]);
									}
								}
							}
						}
						loading--;
						if (loading === 0) {
							deferred.resolve();
						}
					});
				}
			}

			function rewriteReference(item, prefix) {
				// rewrite external references paths
				var $ref = item.schema && item.schema.$ref;
				if ($ref && $ref.indexOf('#/') === 0) {
					item.schema.$ref = prefix + '#/' + $ref;
				}
			}

			function checkDefinitions(item) {
				// check if an item has an external reference
				if (isExternal(item)) {
					loadDefinitions(item);
				} else if (isExternal(item.items)) {
					loadDefinitions(item.items);
				}
			}

			function checkOperationDefinitions(operation) {
				// check if operation params or responses have external references
				for (var j = 0, params = operation.parameters || [], k = params.length; j < k; j++) {
					if (params[j].schema) {
						checkDefinitions(params[j].schema);
					}
				}
				for (var code in (operation.responses || {})) {
					if (operation.responses[code].schema) {
						checkDefinitions(operation.responses[code].schema);
					}
				}
			}
			for (var path in swagger.paths) {
				var operations = swagger.paths[path];
				for (var httpMethod in operations) {
					checkOperationDefinitions(operations[httpMethod]);
				}
			}
			if (loading === 0) {
				// may have no external definitions
				deferred.resolve();
			}
		}

	}]);