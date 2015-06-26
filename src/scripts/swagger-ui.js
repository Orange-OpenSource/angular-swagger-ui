/*
 * Orange angular-swagger-ui - v0.1.5
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
				url: '=',
				apiExplorer: '=',
				errorHandler: '=',
				apiExplorerTransform: '='
			}
		};
	})
	.controller('swaggerUiController', ['$scope', '$http', '$sce', '$location', 'swaggerModel', 'swaggerClient',
		function($scope, $http, $sce, $location, swaggerModel, swaggerClient) {

			var swagger;

			// WARNING only Swagger 2.0 is supported (@see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md)
			// WARNING application/xml is not supported
			// WARNING authentication is not implemented, please use 'api-explorer-transform' directive's param to customize API calls

			function get(url, callback) {
				$scope.loading = true;
				var notifyError = typeof $scope.errorHandler === 'function';
				$http.get(url)
					.success(function(data /*, status, headers, config*/ ) {
						$scope.loading = false;
						callback(data);
					})
					.error(function(data, status /*, headers, config*/ ) {
						$scope.loading = false;
						if (notifyError) {
							$scope.errorHandler(data, status);
						}
					});
			}

			$scope.$watch('url', function(url) {
				//reset
				$scope.infos = {};
				$scope.resources = [];
				$scope.form = {};
				if (url && url !== '') {
					// load Swagger description
					var notifyError = typeof $scope.errorHandler === 'function';
					get(url, function(data) {
						swagger = data;
						if (data.swagger === '2.0') {
							parseV2(swagger);
						} else if (notifyError) {
							$scope.errorHandler('unsupported swagger version', '415');
						}
					});
				}
			});

			/**
			 * parses swagger description to ease HTML generation
			 */
			function parseV2() {
				$scope.infos = swagger.info;
				$scope.infos.scheme = swagger.schemes && swagger.schemes[0] || 'http';
				$scope.infos.basePath = swagger.basePath;
				$scope.infos.host = swagger.host;
				$scope.infos.description = $sce.trustAsHtml($scope.infos.description);

				var operationId = 0,
					paramId = 0,
					map = {},
					form = {},
					resources = [],
					openPath = $location.search().open;

				// parse resources
				if (!swagger.tags) {
					resources.push({
						name: 'default',
						open: true
					});
					map['default'] = 0;
				} else {
					for (var i = 0, l = swagger.tags.length; i < l; i++) {
						var tag = swagger.tags[i];
						resources.push(tag);
						map[tag.name] = i;
					}
				}
				// parse operations
				for (var path in swagger.paths) {
					for (var httpMethod in swagger.paths[path]) {
						var operation = swagger.paths[path][httpMethod];
						//TODO manage 'deprecated' operations ?
						operation.id = operationId;
						form[operationId] = {
							contentType: operation.consumes && operation.consumes.length === 1 ? operation.consumes[0] : 'application/json',
							responseType: 'application/json'
						};
						operation.httpMethod = httpMethod;
						operation.path = path;
						// parse operation's parameters
						for (var j = 0, params = operation.parameters || [], k = params.length; j < k; j++) {
							//TODO manage 'collectionFormat' (csv, multi etc.) ?
							//TODO manage constraints (pattern, min, max etc.) ?
							var param = params[j];
							param.id = paramId;
							param.type = swaggerModel.getType(param);
							if (param.items && param.items.enum){
								param.enum = param.items.enum;
								param.default = param.items.default;
							}
							param.subtype = param.enum ? 'enum' : param.type;
							// put param into form scope
							form[operationId][param.name] = param.default || '';
							if (param.schema) {
								param.schema.display = 1; // display schema
								param.schema.json = swaggerModel.generateSampleJson(swagger, param.schema);
								param.schema.model = $sce.trustAsHtml(swaggerModel.generateModel(swagger, param.schema));
							}
							if (param.in === 'body') {
								operation.consumes = operation.consumes || ['application/json'];
							}
							paramId++;
						}
						// parse operation's responses
						if (operation.responses) {
							for (var code in operation.responses) {
								//TODO manage headers, examples ?
								var resp = operation.responses[code];
								resp.description = $sce.trustAsHtml(resp.description);
								if (resp.schema) {
									resp.schema.json = swaggerModel.generateSampleJson(swagger, resp.schema);
									if (resp.schema.type === 'object' || resp.schema.type === 'array' || resp.schema.$ref) {
										resp.display = 1; // display schema
										resp.schema.model = $sce.trustAsHtml(swaggerModel.generateModel(swagger, resp.schema));
									} else if (resp.schema.type === 'string') {
										delete resp.schema;
									}
									if (code === '200' || code === '201') {
										operation.responseClass = resp;
										operation.responseClass.display = 1;
										operation.responseClass.status = code;
										delete operation.responses[code];
									} else {
										operation.hasResponses = true;
									}
								} else {
									operation.hasResponses = true;
								}
							}
						}
						operation.tags = operation.tags || ['default'];
						// map operation to resource
						var tag = operation.tags[0];
						if (typeof map[tag] === 'undefined') {
							map[tag] = resources.length;
							resources.push({
								name: tag
							});
						}
						var res = resources[map[operation.tags[0]]];
						operation.open = openPath === operation.operationId || openPath === res.name + '*';
						res.operations = res.operations || [];
						res.operations.push(operation);
						if (operation.open) {
							res.open = true;
						}
						operationId++;
					}
				}
				// cleanup resources
				for (var i = 0; i < resources.length; i++) {
					var res = resources[i],
						operations = resources[i].operations;

					res.open = res.open || openPath === res.name || openPath === res.name + '*';
					if (!operations || (operations && operations.length === 0)) {
						resources.splice(i, 1);
					}
				}
				// sort resources alphabeticaly
				resources.sort(function(a, b) {
					if (a.name > b.name) {
						return 1;
					} else if (a.name < b.name) {
						return -1;
					}
					return 0;
				});
				// clear cache
				swaggerModel.clearCache();
				// display swagger
				$scope.form = form;
				$scope.resources = resources;
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
				$location.search('open', name);
			};

			/**
			 * sends a sample API request
			 */
			$scope.submitExplorer = function(operation) {
				operation.loading = true;
				swaggerClient
					.send(swagger, operation, $scope.form[operation.id], $scope.apiExplorerTransform)
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