/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerUiExternalReferences', function($http, $q, swaggerModules, swaggerTranslator) {

		var url,
			deferred,
			openApiSpec;

		/**
		 * Module entry point
		 */
		this.execute = function(data) {
			url = data.url;
			openApiSpec = data.openApiSpec;
			deferred = $q.defer();
			loadExternalReferences();
			return deferred.promise;
		};

		function onError(error) {
			deferred.reject(error);
		}

		/**
		 * Load external definition
		 */
		function get(externalUrl, callback, prefix) {
			var options = {
				method: 'GET',
				url: externalUrl,
				transformResponse: function(json) {
					if (prefix) {
						// rewrite references
						json = json.replace(/"\$ref": ?"#\/(.*)\/(.*)"/g, '"$ref": "#/$1/' + prefix + '/$2"');
					}
					var obj;
					try {
						obj = angular.fromJson(json);
					} catch (e) {
						onError({
							code: 500,
							message: swaggerTranslator.translate('errorJsonParse')
						});
					}
					return obj;
				}
			};
			swaggerModules
				.execute(swaggerModules.BEFORE_LOAD, options)
				.then(function() {
					$http(options)
						.then(function(response) {
							callback(response.data);
						})
						.catch(function(response) {
							onError({
								message: response.data,
								code: response.status
							});
						});
				})
				.catch(onError);
		}

		/**
		 * Generate external URL
		 */
		function getExternalUrl($ref) {
			var parts = $ref.split('#/'),
				externalUrl = parts[0],
				swaggerUrlParts,
				pos;

			if (externalUrl.indexOf('http') !== 0 && externalUrl.indexOf('https') !== 0) {
				// relative url
				if (externalUrl.indexOf('/') === 0) {
					swaggerUrlParts = URL.parse(url);
					externalUrl = swaggerUrlParts.protocol + '//' + swaggerUrlParts.host + externalUrl;
				} else {
					//TODO resolve paths like ./* or ../ => https://swagger.io/docs/specification/using-ref/
					//@see https://github.com/garycourt/uri-js ??
					pos = url.lastIndexOf('/');
					externalUrl = url.substring(0, pos) + '/' + externalUrl;
				}
			}
			return externalUrl;
		}

		/**
		 * Find and resolve external definitions
		 */
		function loadExternalReferences() {
			var loading = 0, key, pathName, path;

			function loadOperations(path) {
				loading++;
				get(getExternalUrl(path.$ref), function(json) {
					loading--;
					delete path.$ref;
					for (key in json) {
						path[key] = json[key];
					}
					if (loading === 0) {
						loadExternalDefinitions();
					}
				});
			}

			for (pathName in openApiSpec.paths) {
				path = openApiSpec.paths[pathName];
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
				loadingUrls = {},
				path, operations, httpMethod;

			function loadDefinitions(item) {
				var key, matches = item.$ref.match(/(.*)#\/(.*)\/(.*)/),
					prefix = matches[1],
					section = matches[2],
					externalUrl = getExternalUrl(item.$ref);

				// rewrite reference
				item.$ref = item.$ref.replace(/(.*)#\/(.*)\/(.*)/, '#/$2/$1/$3');
				// load external if needed
				if (!loadingUrls[externalUrl]) {
					loading++;
					loadingUrls[externalUrl] = true;
					get(externalUrl, function(json) {
						for (key in json) {
							openApiSpec[section][prefix] = json[key];
						}
						loading--;
						if (loading === 0) {
							deferred.resolve(true);
						}
					}, prefix);
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
				var j, params, k, code;
				// check if operation params or responses have external references
				for (j = 0, params = operation.parameters || [], k = params.length; j < k; j++) {
					if (params[j].schema) {
						checkDefinitions(params[j].schema);
					}
				}
				for (code in (operation.responses || {})) {
					if (operation.responses[code].schema) {
						checkDefinitions(operation.responses[code].schema);
					}
				}
			}

			for (path in openApiSpec.paths) {
				operations = openApiSpec.paths[path];
				//TODO manage path parameters
				for (httpMethod in operations) {
					checkOperationDefinitions(operations[httpMethod]);
				}
			}
			if (loading === 0) {
				// may have no external definitions
				deferred.resolve(true);
			}
		}

	})
	.run(function(swaggerModules, swaggerUiExternalReferences) {
		swaggerModules.add(swaggerModules.BEFORE_PARSE, swaggerUiExternalReferences, 1);
	});