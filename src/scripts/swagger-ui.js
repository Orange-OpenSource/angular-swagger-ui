/*
 * Orange angular-swagger-ui - v0.2.7
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi', ['ng', 'swaggerUiTemplates'])
	.directive('swaggerUi', ['$injector', function($injector) {

		return {
			restrict: 'A',
			controller: 'swaggerUiController',
			templateUrl: 'templates/swagger-ui.html',
			scope: {
				// Swagger descriptor URL (string, required)
				url: '=',
				// Swagger descriptor parser type (string, optional, default = "auto")
				// Built-in allowed values:
				// 		"auto": (default) parser is based on response Content-Type
				//		"json": force using JSON parser
				//
				//	More types could be defined by external modules
				parser: '@?',
				// Swagger descriptor loading indicator (variables, optional)
				loading: '=?',
				// Use permalinks? (boolean, optional, default = false)
				// If true and if using $routeProvider, should set 'reloadOnSearch: false' in route
				// configuration to avoid UI being rendered multiple times
				permalinks: '=?',
				// Display API explorer (boolean, optional, default = false)
				apiExplorer: '=?',
				// Error handler (function, optional)
				errorHandler: '=?',
				// Are Swagger descriptors loaded from trusted source only ? (boolean, optional, default = false)
				// If true, it avoids using ngSanitize but consider HTML as trusted so won't be cleaned
				trustedSources: '=?',
				// Allows defining a custom Swagger validator or disabling Swagger validation
				// If false, Swagger validation will be disabled
				// If URL, will be used as Swagger validator
				// If not defined, validator will be 'http://online.swagger.io/validator'
				validatorUrl: '@?',
				refLinkBaseUrl: '=?'
				// Allows display of ref as links within the page
			},
			link: function(scope) {
				// check parameters
				if (scope.permalinks && $injector.has('$route')) {
					var $route = $injector.get('$route');
					if ($route.current && $route.current.$$route && $route.current.$$route.reloadOnSearch) {
						console.warn('AngularSwaggerUI: when using permalinks you should set reloadOnSearch=false in your route config to avoid UI being rebuilt multiple times');
					}
				}
				if (!scope.trustedSources && !$injector.has('$sanitize')) {
					console.warn('AngularSwaggerUI: you must use ngSanitize OR set trusted-sources=true as directive param if swagger descriptors are loaded from trusted sources');
				}
				if (scope.validatorUrl === undefined) {
					scope.validatorUrl = 'http://online.swagger.io/validator';
				}
			}
		};
	}])
	.controller('swaggerUiController', ['$scope', '$http', '$location', '$q', 'swaggerClient', 'swaggerModules', 'swagger2JsonParser', 'swaggerModel',
		function($scope, $http, $location, $q, swaggerClient, swaggerModules, swagger2JsonParser, swaggerModel) {

			var swagger;

			// WARNING authentication is not implemented, please use 'api-explorer-transform' directive's param to customize API calls

			// add default Swagger parser (JSON)
			swaggerModules.add(swaggerModules.PARSE, swagger2JsonParser);
			// set refLinkBaseUrl to allow display of referred object as link
			swaggerModel.setRefLinkBaseUrl( $scope.refLinkBaseUrl );

			/**
			 * Load Swagger descriptor
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
			 * Swagger descriptor has been loaded, launch parsing
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
							swaggerParsed(parseResult);
						} else {
							onError({
								code: 415,
								message: 'no parser found for Swagger descriptor of type ' + swaggerType + ' and version ' + swagger.swagger
							});
						}
					})
					.catch(onError);
			}

			/**
			 * Swagger descriptor has parsed, launch display
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

			$scope.$watch('url', function(url) {
				//reset
				$scope.infos = {};
				$scope.resources = [];
				$scope.form = {};
				if (url && url !== '') {
					if ($scope.loading) {
						//TODO cancel current loading swagger
					}
					// load Swagger descriptor
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
					$location.search('swagger', name);
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

		}
	])
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