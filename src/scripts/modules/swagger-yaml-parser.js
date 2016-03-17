/*
 * Orange angular-swagger-ui - v0.3.1
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerUiYamlParser', function($window, $q, swaggerParser) {

		/**
		 * Module entry point
		 */
		this.execute = function(parserType, url, contentType, data, isTrustedSources, parseResult) {
			var deferred = $q.defer();
			if (parserType === 'yaml' || (parserType === 'auto' && (contentType === 'application/yaml' || contentType === 'text/yaml'))) {
				var YAML = $window.jsyaml;
				if (typeof YAML === 'undefined') {
					deferred.reject({
						code: 500,
						message: 'No YAML parser found, please make sure to include js-yaml library'
					});
				} else {
					try {
						var json = YAML.load(data);
						swaggerParser
							.execute('json', url, 'application/json', json, isTrustedSources, parseResult)
							.then(function(executed) {
								parseResult.transformSwagger = json;
								deferred.resolve(executed);
							})
							.catch(deferred.reject);
					} catch (e) {
						deferred.reject({
							code: 500,
							message: 'failed to parse swagger: ' + e.message
						});
					}
				}
			} else {
				deferred.resolve(false);
			}
			return deferred.promise;
		};

	})
	.run(function(swaggerModules, swaggerUiYamlParser) {
		swaggerModules.add(swaggerModules.PARSE, swaggerUiYamlParser);
	});