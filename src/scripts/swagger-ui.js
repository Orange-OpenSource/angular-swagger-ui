/*
 * Orange angular-swagger-ui - v0.2.1
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi', ['ng', 'swaggerUiTemplates'])
	.directive('swaggerUi', function() {

		return {
			restrict: 'A',
			controller: 'swaggerUiController',
			templateUrl: 'templates/swagger-ui.html',
			scope: {
				url: '=', // Swagger descriptor URL (string)
				loading: '=?', // Swagger descriptor loading indicator (boolean, optional)
				apiExplorer: '=?', // Enable/Disable API explorer (boolean, optional)
				errorHandler: '=?', // Error handler (function, optional)
				trustedSources: '=?' // Are Swagger descriptors loaded from trusted source only ? (boolean, optional) ==> Avoid using ngSanitize
			}
		};
	})
	.controller('swaggerUiController', ['$scope', '$http', '$location', '$q', 'swaggerClient', 'swaggerModules', 'swaggerJsonParser',
		function($scope, $http, $location, $q, swaggerClient, swaggerModules, swaggerJsonParser) {

			var swagger;

			// WARNING only Swagger 2.0 is supported (@see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md)
			// WARNING authentication is not implemented, please use 'api-explorer-transform' directive's param to customize API calls

			// add default Swagger parser (JSON)
			swaggerModules.add(swaggerModules.PARSE, swaggerJsonParser);

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
			function swaggerLoaded(swaggerType) {
				$scope.loading = false;
				if (swagger.swagger === '2.0') {
					var parseResult = {};
					// execute modules
					swaggerModules
						.execute(swaggerModules.PARSE, swaggerType, swagger, $scope.trustedSources, parseResult)
						.then(function() {
							swaggerParsed(parseResult);
						})
						.catch(onError);
				} else {
					onError({
						code: '415',
						message: 'unsupported swagger version'
					});
				}
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
				}
			}

			$scope.$watch('url', function(url) {
				//reset
				$scope.infos = {};
				$scope.resources = [];
				$scope.form = {};
				if (url && url !== '') {
					// load Swagger descriptor
					loadSwagger(url, function(data, status, headers) {
						swagger = data;
						// execute modules
						swaggerModules
							.execute(swaggerModules.BEFORE_PARSE, url, swagger)
							.then(function() {
								var swaggerType = headers()['content-type'] || 'application/json';
								swaggerLoaded(swaggerType);
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
				$location.search('open', name);
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