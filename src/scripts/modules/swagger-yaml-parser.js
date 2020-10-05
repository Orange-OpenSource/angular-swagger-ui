/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerUiYamlParser', function($window, $q, swaggerModules, swaggerTranslator) {

		/**
		 * Module entry point
		 */
		this.execute = function(data) {
			var deferred = $q.defer();
			if (data.parser === 'yaml' || (data.parser === 'auto' && data.contentType.indexOf('/yaml') > 0)) {
				var YAML = $window.jsyaml;
				if (typeof YAML === 'undefined') {
					deferred.reject({
						code: 500,
						message: swaggerTranslator.translate('errorNoYamlParser')
					});
				} else {
					try {
						data.openApiSpec = YAML.load(data.openApiSpec);
						data.parser = 'json';
						deferred.resolve(true);
					} catch (e) {
						deferred.reject({
							code: 500,
							message: swaggerTranslator.translate('errorParseFailed', e)
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
		swaggerModules.add(swaggerModules.BEFORE_PARSE, swaggerUiYamlParser, 20);
	});