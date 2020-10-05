/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerUiMarkdown', function($window, $injector, $q, $sce) {

		/**
		 * Module entry point
		 */
		this.execute = function(data) {
			var deferred = $q.defer();
			if (typeof $window.marked === 'undefined') {
				console.error('AngularSwaggerUI: marked.js is missing');
				deferred.resolve(false);
			} else {
				transformMarkdown(data.ui);
				deferred.resolve(true);
			}
			return deferred.promise;
		};

		function transformMarkdown(parseResult) {
			markdown(parseResult.infos);
			angular.forEach(parseResult.resources, function(resource) {
				angular.forEach(resource.operations, function(operation) {
					markdown(operation);
					angular.forEach(operation.parameters, function(parameter) {
						markdown(parameter);
					});
					angular.forEach(operation.responses, function(response) {
						markdown(response);
					});
				});
			});
		}

		function markdown(item) {
			var $sanitize, desc, isString,
				toMarkdown = [item, item.externalDocs];

			angular.forEach(toMarkdown, function(obj) {
				desc = obj && obj.description;
				if (desc) {
					isString = angular.isString(desc);
					if (desc.$$unwrapTrustedValue) {
						// looks like it's a trusted source (@see $sce)
						desc = desc.toString();
					} else if (isString && $injector.has('$sanitize')) {
						$sanitize = $injector.get('$sanitize');
						desc = $sanitize(desc);
					}
					if (angular.isString(desc) && desc !== '') {
						obj.description = $sce.trustAsHtml($window.marked(desc));
					}
				}
			});
		}

	})
	.run(function(swaggerModules, swaggerUiMarkdown) {
		swaggerModules.add(swaggerModules.BEFORE_DISPLAY, swaggerUiMarkdown, 1);
	});