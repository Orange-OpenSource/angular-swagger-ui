/*
 * Orange angular-swagger-ui - v0.3.2
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
				// Swagger specification URL (string, required)
				url: '=?',
				// Swagger specification parser type (string, optional, default = "auto")
				// Built-in allowed values:
				// 		"auto": (default) parser is based on response Content-Type
				//		"json": force using JSON parser
				//		"yaml": force using YAML parser, requires to use module 'swagger-yaml-parser'
				//
				// More types could be defined by external modules
				parser: '@?',
				// Swagger specification loading indicator (variables, optional)
				loading: '=?',
				// Use permalinks? (boolean, optional, default = false)
				permalinks: '=?',
				// Display API explorer (boolean, optional, default = false)
				apiExplorer: '=?',
				// Error handler (function, optional)
				errorHandler: '=?',
				// Are Swagger specifications loaded from trusted source only ? (boolean, optional, default = false)
				// If true, it avoids using ngSanitize but consider HTML as trusted so won't be cleaned
				trustedSources: '=?',
				// Allows defining a custom Swagger validator or disabling Swagger validation
				// If false, Swagger validation will be disabled
				// If URL, will be used as Swagger validator
				// If not defined, validator will be 'http://online.swagger.io/validator'
				validatorUrl: '@?',
				// Specifies the type of "input" parameter to allow rendering Swagger specification from object or string (string, optional)
				// Allowed values:
				// 		"url": (default) "input" parameter is an URL
				//		"json": "input" parameter is a JSON object
				//		"yaml": "input" parameter is a YAML string, requires to use module 'swagger-yaml-parser'
				//
				inputType: '@?',
				// Allows rendering an external Swagger specification (string or object, optional)
				input: '=?'
			},
			link: function(scope) {
				// check parameters
				if (!scope.trustedSources && !$injector.has('$sanitize')) {
					console.warn('AngularSwaggerUI: You must use ngSanitize OR set trusted-sources=true as directive param if swagger specifications are loaded from trusted sources');
				}
				if (scope.validatorUrl === undefined) {
					scope.validatorUrl = 'http://online.swagger.io/validator';
				}
			}
		};
	})
	.controller('swaggerUiController', function($scope, $http, $location, $anchorScroll, $timeout, swaggerClient, swaggerModules, swaggerTranslator) {

		var swagger;

		// WARNING authentication is not implemented, please use modules to customize API calls, see README.md

		/**
		 * Load Swagger specification
		 */
		function loadSwagger(url, callback) {
			$scope.loading = true;
			var options = {
				method: 'GET',
				url: url
			};
			swaggerModules
				.execute(swaggerModules.BEFORE_LOAD, options)
				.then(function() {
					$http(options)
						.success(callback)
						.error(function(data, status) {
							onError({
								code: status,
								message: data
							});
						});
				})
				.catch(onError);
		}

		/**
		 * Swagger specification has been loaded, launch parsing
		 */
		function swaggerLoaded(swaggerUrl, swaggerType) {
			$scope.loading = false;
			var parseResult = {};
			// execute modules
			$scope.parser = $scope.parser || 'auto';
			swaggerModules
				.execute(swaggerModules.PARSE, $scope.parser, swaggerUrl, swaggerType, swagger, $scope.trustedSources, parseResult)
				.then(function(executed) {
					if (executed) {
						if (parseResult.transformSwagger) {
							swagger = parseResult.transformSwagger;
							delete parseResult.transformSwagger;
						}
						swaggerParsed(parseResult);
					} else {
						onError({
							code: 415,
							message: swaggerTranslator.translate('errorNoParserFound', {
								type: swaggerType,
								version: swagger.swagger
							})
						});
					}
				})
				.catch(onError);
		}

		/**
		 * Swagger specification has parsed, launch display
		 */
		function swaggerParsed(parseResult) {
			// execute modules
			swaggerModules
				.execute(swaggerModules.BEFORE_DISPLAY, parseResult)
				.then(function() {
					// display swagger UI
					$scope.infos = parseResult.infos;
					$scope.form = parseResult.form;
					$scope.resources = parseResult.resources;
					if ($scope.permalinks) {
						$timeout(function() {
							$anchorScroll();
						}, 100);
					}
				})
				.catch(onError);
		}

		function onError(error) {
			$scope.loading = false;
			if (typeof $scope.errorHandler === 'function') {
				$scope.errorHandler(error.message, error.code);
			} else {
				console.error(error.code, 'AngularSwaggerUI: ' + error.message);
			}
		}

		function watchData() {
			$scope.$watch('input', function(data) {
				//reset
				$scope.infos = {};
				$scope.resources = [];
				$scope.form = {};
				if (data) {
					swagger = data;
					swaggerLoaded(null, 'application/' + $scope.inputType);
				}
			});
		}

		function watchUrl(key) {
			$scope.$watch(key, function(url) {
				//reset
				$scope.infos = {};
				$scope.resources = [];
				$scope.form = {};
				if (url && url !== '') {
					if ($scope.loading) {
						//TODO cancel current loading swagger
					}
					if ($scope.validatorUrl && url.indexOf('http') !== 0) {
						// make URL absolute to make validator working
						$scope.url = absoluteUrl(url);
						return;
					}
					// load Swagger specification
					loadSwagger(url, function(data, status, headers) {
						swagger = data;
						// execute modules
						swaggerModules
							.execute(swaggerModules.BEFORE_PARSE, url, swagger)
							.then(function() {
								var contentType = headers()['content-type'] || 'application/json',
									swaggerType = contentType.split(';')[0];

								swaggerLoaded(url, swaggerType);
							})
							.catch(onError);
					});
				}
			});
		}

		switch ($scope.inputType) {
			case 'json':
			case 'yaml':
				$scope.validatorUrl = false; // disable validator
				watchData();
				break;
			case 'url':
				watchUrl('input');
				break;
			default:
				watchUrl('url');
				break;
		}

		/**
		 * transform a relative URL to an absolute URL
		 */
		function absoluteUrl(url) {
			var a = document.createElement('a');
			a.href = url;
			return a.href;
		}

		/**
		 * show all resource's operations as list or as expanded list
		 */
		$scope.expand = function(resource, expandOperations) {
			resource.open = true;
			for (var i = 0, op = resource.operations, l = op.length; i < l; i++) {
				op[i].open = expandOperations;
			}
		};

		$scope.permalink = function(name) {
			if ($scope.permalinks) {
				$location.hash(name);
				$timeout(function() {
					$anchorScroll();
				}, 50);
			}
		};

		/**
		 * sends a sample API request
		 */
		$scope.submitExplorer = function(operation) {
			operation.loading = true;
			swaggerClient
				.send(swagger, operation, $scope.form[operation.id])
				.then(function(result) {
					operation.loading = false;
					operation.explorerResult = result;
				});
		};

	})
	.directive('fileInput', function() {
		// helper to be able to retrieve HTML5 File in ngModel from input
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function(scope, element, attr, ngModel) {
				element.bind('change', function() {
					scope.$apply(function() {
						//TODO manage multiple files ?
						ngModel.$setViewValue(element[0].files[0]);
					});
				});
			}
		};
	});