/*
 * Orange angular-swagger-ui - v0.5.0
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.controller('swaggerUiController', ["$scope", "$window", "$http", "$location", "$anchorScroll", "$timeout", "swaggerClient", "swaggerModules", "swaggerTranslator", "swaggerLoader", function($scope, $window, $http, $location, $anchorScroll, $timeout, swaggerClient, swaggerModules, swaggerTranslator, swaggerLoader) {

		var openApiSpec;

		/**
		 * OpenApi specification has been loaded, launch parsing
		 */
		function swaggerLoaded(url, data) {
			$scope.loading = false;
			// execute modules
			swaggerModules
				.execute(swaggerModules.PARSE, data)
				.then(function(executed) {
					if (executed) {
						swaggerParsed(data);
					} else {
						onError({
							code: 415,
							message: swaggerTranslator.translate('errorNoParserFound', {
								type: data.contentType,
								version: data.openApiSpec
							})
						});
					}
				})
				.catch(onError);
		}

		/**
		 * OpenApi specification has been parsed, launch display
		 */
		function swaggerParsed(data) {
			// execute modules
			swaggerModules
				.execute(swaggerModules.BEFORE_DISPLAY, data)
				.then(function() {
					// display swagger UI
					openApiSpec = data.openApiSpec;
					$scope.infos = data.ui.infos;
					$scope.form = data.ui.form;
					$scope.resources = data.ui.resources;
					if ($scope.permalinks) {
						$timeout(function() {
							$anchorScroll();
						}, 200);
					}
				})
				.catch(onError);
		}

		function onError(error) {
			console.error(error.code, 'AngularSwaggerUI: ' + error.message);
			$scope.loading = false;
			if (typeof $scope.errorHandler === 'function') {
				$scope.errorHandler(error.message, error.code);
			}
		}

		function watchData() {
			$scope.$watch('input', function(data) {
				//reset
				$scope.infos = {};
				$scope.resources = [];
				$scope.form = {};
				if (data) {
					swaggerLoaded(null, {
						openApiSpec: angular.copy(data),
						parser: $scope.parser || $scope.inputType || 'json',
						contentType: 'application/' + ($scope.inputType || 'json')
					});
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
						//TODO cancel current loading spec
					}
					if ($scope.validatorUrl && url.indexOf('http') !== 0) {
						// make URL absolute to make validator working
						$scope.url = absoluteUrl(url);
						return;
					}
					// load OpenApi specification
					var data = {
						url: url,
						parser: $scope.parser || 'auto',
						trustedSources: $scope.trustedSources
					};
					swaggerLoader
						.get(data)
						.then(function() {
							return swaggerModules.execute(swaggerModules.BEFORE_PARSE, data);
						})
						.then(function() {
							swaggerLoaded(url, data);
						})
						.catch(onError);
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

		$window.swaggerlink = $scope.permalink = function(name) {
			if ($scope.permalinks) {
				$location.hash(name);
			}
			$timeout(function() {
				$anchorScroll(name);
			}, 50);
		};

		/**
		 * sends a sample API request
		 */
		$scope.submitExplorer = function(operation) {
			operation.loading = true;
			swaggerClient
				.send(openApiSpec, operation, $scope.form[operation.id])
				.then(function(result) {
					operation.loading = false;
					operation.explorerResult = result;
				});
		};

		/**
		 * handle operation's authentication params
		 */
		$scope.auth = function(operation) {
			var i = 0,
				sec, key, auth = [],
				security = operation.security;

			for (; i < security.length; i++) {
				sec = security[i];
				for (key in sec) {
					auth.push(openApiSpec.securityDefinitions[key]);
				}
			}
			swaggerModules
				.execute(swaggerModules.AUTH, {
					operation: operation,
					auth: auth
				})
				.catch(onError);
		};

		/**
		 * check if operation's authorization params are set
		 */
		$scope.authValid = function(operation) {
			var i = 0,
				sec, auth, key,
				security = operation.security;

			for (; i < security.length; i++) {
				sec = security[i];
				for (key in sec) {
					auth = openApiSpec.securityDefinitions[key];
					if (auth.valid) {
						operation.authParams = angular.copy(auth);
						operation.authParams.scopes = sec[key];
						return true;
					}
				}
			}
			return false;
		};

	}]);