/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.controller('swaggerUiController', function($scope, $window, $location, $anchorScroll, $timeout, $sce, $q, swaggerClient, swaggerModules, swaggerTranslator, swaggerLoader, swaggerModel) {

		var openApiSpec;

		/**
		 * OpenApi specification has been loaded, launch parsing
		 */
		function swaggerLoaded(url, data) {
			$scope.loading = false;
			swaggerModel.clearCache();
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
								type: data.contentType
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
					$scope.ui = data.ui;
					if ($scope.permalinks) {
						$timeout(function() {
							$anchorScroll();
						}, 200);
					}
				})
				.catch(onError);
		}

		function onError(error) {
			console.error('AngularSwaggerUI', error);
			$scope.loading = false;
			if (typeof $scope.errorHandler === 'function') {
				$scope.errorHandler(error.message, error.code);
			}
		}

		function watchData() {
			return $scope.$watch('input', function(spec) {
				reset();
				if (spec) {
					$scope.loading = true;
					swaggerLoaded(null, {
						openApiSpec: angular.copy(spec),
						parser: $scope.parser || $scope.inputType || 'json',
						contentType: 'application/' + ($scope.inputType || 'json')
					});
				}
			});
		}

		function watchUrl(key) {
			return $scope.$watch(key, function(url) {
				reset();
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
					$scope.loading = true;
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

		function reset() {
			$scope.ui = {
				form: {},
				infos: {},
				resources: []
			};
			openApiSpec = null;
		}

		function watchInputType() {
			var unwatch;
			$scope.$watch('inputType', function(inputType) {
				reset();
				if (unwatch) {
					unwatch();
				}
				switch (inputType) {
					case 'json':
					case 'yaml':
						$scope.validatorUrl = false; // disable validator
						unwatch = watchData();
						break;
					case 'url':
						unwatch = watchUrl('input');
						break;
					default:
						unwatch = watchUrl('url');
						break;
				}
			});
		}

		watchInputType();

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
				$timeout(function() {
					$location.hash(name);
					$anchorScroll(name);
				}, 50);
			}
		};

		/**
		 * sends a sample API request
		 */
		$scope.submitExplorer = function(operation) {
			operation.loading = true;
			swaggerClient
				.send(openApiSpec, operation, $scope.ui.form[operation.id], getSecurityDefinitions(operation))
				.then(function(result) {
					operation.loading = false;
					operation.explorerResult = result;
				});
		};

		function getSecurityDefinitions(operation) {
			var i = 0,
				security, key,
				operationSecurityDefinitions = {},
				securities = operation.security || [];

			if (openApiSpec) {
				for (; i < securities.length; i++) {
					security = securities[i];
					for (key in security) {
						operationSecurityDefinitions[key] = openApiSpec.securityDefinitions[key];
					}
				}
			}
			return operationSecurityDefinitions;
		}

		/**
		 * handle operation's authentication params
		 */
		$scope.auth = function(operation) {
			swaggerModules
				.execute(swaggerModules.AUTH, {
					securityDefinitions: getSecurityDefinitions(operation)
				})
				.catch(onError);
		};

		/**
		 * check if operation's authorization params are set
		 */
		$scope.authValid = function(operation) {
			var key,
				securityDefinitions = getSecurityDefinitions(operation);

			for (key in securityDefinitions) {
				if (!securityDefinitions[key].valid) {
					return false;
				}
			}
			return true;
		};

		$scope.getModel = function(obj, operationId, section) {
			var id = operationId + '-' + section;
			obj.models = obj.models || {};
			if (!obj.models[id] && obj.schema) {
				obj.models[id] = $sce.trustAsHtml(swaggerModel.generateModel(openApiSpec, obj.schema, id, $scope.showInheritedProperties));
			}
			return obj.models[id];
		};

		$scope.getSample = function(obj, contentType) {
			obj.samples = obj.samples || {};
			if (contentType && !obj.samples[contentType] && obj.schema) {
				obj.samples[contentType] = swaggerModel[contentType.indexOf('/xml') >= 0 ? 'generateSampleXml' : 'generateSampleJson'](openApiSpec, obj.schema, obj.examples && obj.examples[contentType]);
			}
			return obj.samples[contentType];
		};

	});