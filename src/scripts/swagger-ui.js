/*
 * angular-swagger-ui
 * http://github.com/maales/angular-swagger-ui
 * Version: 0.1.0 - 2015-02-26
 * License: MIT
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
				tryIt: '=',
				errorHandler: '=',
				transformTryIt: '='
			}
		};
	})
	.controller('swaggerUiController', ['$scope', '$http', '$sce', 'swaggerModel', 'swaggerClient', function($scope, $http, $sce, swaggerModel, swaggerClient) {

		var swagger;

		// WARNING only Swagger 2.0 is supported (@see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md)
		// WARNING XML is not supported
		// WARNING authentication is not implemented, please use 'transform-try-it' directive's param to customize API calls

		//TODO find a way to implement permalinks !!

		$scope.$watch('url', function(url) {
			//reset
			$scope.infos = {};
			$scope.resources = [];
			$scope.form = {};
			if (url && url !== '') {
				// load Swagger description
				var notifyError = typeof $scope.errorHandler === 'function';
				$http.get(url)
					.success(function(data /*, status, headers, config*/ ) {
						swagger = data;
						if (data.swagger === '2.0') {
							parseV2(swagger);
						} else if (notifyError) {
							$scope.errorHandler('unsupported swagger version', '415');
						}
					})
					.error(function(data, status /*, headers, config*/ ) {
						if (notifyError) {
							$scope.errorHandler(data, status);
						}
					});
			}
		});

		/**
		 * parses swagger description to ease HTML generation
		 */
		function parseV2() {
			console.log(swagger);
			$scope.infos = swagger.info;
			$scope.infos.description = $sce.trustAsHtml($scope.infos.description);
			var contact = $scope.infos.contact;
			if (contact) {
				contact.url = contact.email ? 'mailto:' + contact.email : contact.url;
			}
			var operationId = 0,
				paramId = 0,
				map = {},
				form = {},
				resources = [];

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
						// put param into form scope
						form[operationId][param.name] = param.default || '';
						if (param.schema) {
							param.schema.display = 1; // display schema
							param.schema.json = swaggerModel.generateSampleJson(swagger, param.schema);
							param.schema.model = $sce.trustAsHtml(swaggerModel.generateModel(swagger, param.schema));
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
								var sample = swaggerModel.generateSampleJson(swagger, resp.schema);
								if (code === '200') {
									var responseClass = operation.responseClass = {
										status: code,
										display: -1
									};
									if (resp.schema.type === 'array' || resp.schema.$ref) {
										responseClass.display = 1; // display schema
										responseClass.json = sample;
										responseClass.model = $sce.trustAsHtml(swaggerModel.generateModel(swagger, resp.schema));
									}
									//TODO delete 200 response from array as swagger-ui does ?
								} else {
									resp.schema.json = sample;
								}
							}
						}
					}
					operation.tags = operation.tags || ['default'];
					// map operation to resource
					var res = resources[map[operation.tags[0]]]; //TODO make sure there is only one defined !
					res.operations = res.operations || [];
					res.operations.push(operation);
					operationId++;
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
			console.log(resources);
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

		/**
		 * sends a sample API request
		 */
		$scope.submitTryIt = function(operation) {
			operation.loading = true;
			swaggerClient
				.send(swagger, operation, $scope.form[operation.id], $scope.transformTryIt)
				.then(function(result) {
					operation.loading = false;
					operation.tryItResult = result;
				});

		};

	}])
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