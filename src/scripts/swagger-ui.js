/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi', ['ng'])
	.directive('swaggerUi', function($injector) {

		return {
			restrict: 'A',
			controller: 'swaggerUiController',
			templateUrl: function(element, attrs) {
				return attrs.templateUrl || 'templates/swagger-ui.html';
			},
			scope: {
				// OpenApi specification URL (string, required)
				url: '=?',
				// OpenApi specification parser type (string, optional, default = "auto")
				// Built-in allowed values:
				// 		"auto": (default) parser is based on response Content-Type
				//		"json": force using JSON parser
				//		"yaml": force using YAML parser, requires to use module 'swagger-yaml-parser'
				//
				// More types could be defined by external modules
				parser: '@?',
				// OpenApi specification loading indicator (variables, optional)
				loading: '=?',
				// Use permalinks? (boolean, optional, default = false)
				permalinks: '=?',
				// Display link to download swagger file (empty or i18n label, default = null)
				download: '@?',
				// Display API explorer (boolean, optional, default = false)
				apiExplorer: '=?',
				// Error handler (function, optional)
				errorHandler: '=?',
				// Are OpenApi specifications loaded from trusted source only ? (boolean, optional, default = false)
				// If true, it avoids using ngSanitize but consider HTML as trusted so won't be cleaned
				trustedSources: '=?',
				// Allows defining a custom OpenApi validator or disabling OpenApi validation
				// If false, OpenApi validation will be disabled
				// If URL, will be used as OpenApi validator
				// If not defined, validator will be 'http://online.swagger.io/validator'
				validatorUrl: '@?',
				// Specifies the type of "input" parameter to allow rendering OpenApi specification from object or string (string, optional)
				// Allowed values:
				// 		"url": (default) "input" parameter is an URL
				//		"json": "input" parameter is a JSON object
				//		"yaml": "input" parameter is a YAML string, requires to use module 'swagger-yaml-parser'
				//
				inputType: '@?',
				// Allows rendering an external OpenApi specification (string or object, optional)
				input: '=?',
				// When displaying polymorphic models, show inherited properties ? (boolean, optional, default = false)
				showInheritedProperties: '=?'
			},
			link: function(scope) {
				// check parameters
				if (!scope.trustedSources && !$injector.has('$sanitize')) {
					console.warn('AngularSwaggerUI: You must use ngSanitize OR set trusted-sources=true as directive param if OpenApi specifications are loaded from trusted sources');
				}
				if (scope.validatorUrl === undefined) {
					scope.validatorUrl = 'http://online.swagger.io/validator';
				}
				if (typeof scope.download === 'undefined') {
					scope.download = null;
				}
			}
		};
	});