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
	.service('swaggerClient', ['$q', '$http', function($q, $http) {

		function formatResult(deferred, data, status, headers, config) {
			deferred.resolve({
				url: config.url,
				response: {
					body: data ? (angular.isString(data) ? data : angular.toJson(data, true)) : 'no content',
					status: status,
					headers: angular.toJson(headers(), true)
				}
			});
		}

		this.send = function(swagger, operation, values, transform) {
			var deferred = $q.defer(),
				query = {},
				headers = {},
				path = operation.path;

			// build request parameters
			for (var i = 0, params = operation.parameters || [], l = params.length; i < l; i++) {
				//TODO manage 'collectionFormat' (csv etc.) !!
				var param = params[i],
					value = values[param.name];

				switch (param.in) {
					case 'query':
						if (!!value) {
							query[param.name] = value;
						}
						break;
					case 'path':
						path = path.replace('{' + param.name + '}', encodeURIComponent(value));
						break;
					case 'header':
						if (!!value) {
							headers[param.name] = value;
						}
						break;
					case 'formData':
						values.body = values.body || new FormData();
						if (!!value) {
							if (param.type === 'file') {
								values.contentType = undefined; // make browser defining it by himself
							}
							values.body.append(param.name, value);
						}
						break;
				}
			}

			// add headers
			headers.Accept = values.responseType;
			headers['Content-Type'] = values.body ? values.contentType : 'text/plain';

			// build request
			//FIXME should use server hosting the documentation if scheme or host are not defined
			var request = {
					method: operation.httpMethod,
					url: [swagger.schemes && swagger.schemes[0] || 'http', '://', swagger.host, swagger.basePath || '', path].join(''),
					headers: headers,
					data: values.body,
					params: query
				},
				callback = function(data, status, headers, config) {
					formatResult(deferred, data, status, headers, config);
				};

			// apply transform
			if (typeof transform === 'function') {
				transform(request);
			}

			// send request
			$http(request)
				.success(callback)
				.error(callback);

			return deferred.promise;
		};

	}])
	.service('swaggerModel', ['$filter', function($filter) {

		/**
		 * sample object cache to avoid generating the same one multiple times
		 */
		var objCache = {};

		/**
		 * model cache to avoid generating the same one multiple times
		 */
		var modelCache = {};

		/**
		 * determines a property type
		 */
		var getType = this.getType = function(item) {
			var format = item.format;
			switch (format) {
				case 'int32':
					format = item.type;
					break;
				case 'int64':
					format = 'long';
					break;
			}
			return format || item.type;
		};

		/**
		 * retrieves object class name based on definition
		 */
		function getClassName(schema) {
			return schema.$ref.replace('#/definitions/', '');
		}

		/**
		 * generates a sample object (request body or response body)
		 */
		function getSampleObj(swagger, schema) {
			var sample;
			if (schema.$ref) {
				// complex object
				var def = swagger.definitions && swagger.definitions[getClassName(schema)];
				if (def) {
					if (!objCache[schema.$ref]) {
						// object not in cache
						var obj = {};
						for (var name in def.properties) {
							obj[name] = getSampleObj(swagger, def.properties[name]);
						}
						// cache generated object
						objCache[schema.$ref] = obj;
					}
					sample = objCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				sample = [getSampleObj(swagger, schema.items)];
			} else {
				sample = getSampleValue(getType(schema), schema.defaultValue || schema.example);
			}
			return sample;
		}

		/**
		 * generates a sample value for a basic type
		 */
		function getSampleValue(type, defaultValue) {
			var result;
			if (typeof defaultValue !== 'undefined') {
				result = defaultValue;
			} else {
				switch (type) {
					case 'long':
					case 'integer':
						result = 0;
						break;
					case 'boolean':
						result = false;
						break;
					case 'double':
					case 'number':
						result = 0.0;
						break;
					case 'string':
						result = 'string';
						break;
					case 'date':
						result = $filter('date')(new Date(), 'yyyy-MM-dd');
						break;
					case 'date-time':
						result = (new Date()).toISOString();
						break;
				}
			}
			return result;
		}

		/**
		 * generates a sample JSON string (request body or response body)
		 */
		this.generateSampleJson = function(swagger, schema) {
			var json,
				obj = getSampleObj(swagger, schema);

			if (obj) {
				json = angular.toJson(obj, true);
			}
			return json;
		};

		/**
		 * generates object's model
		 */
		var generateModel = this.generateModel = function(swagger, schema) {
			var model = '';

			function isRequired(item, name) {
				return item.required && item.required.indexOf(name) !== -1;
			}

			if (schema.$ref) {
				var className = getClassName(schema),
					def = swagger.definitions && swagger.definitions[className];

				if (def) {
					if (!modelCache[schema.$ref]) {
						// object not in cache
						var strModel = ['<strong>' + className + ' {</strong>'],
							buffer = [];

						for (var name in def.properties) {
							var prop = def.properties[name],
								propModel = ['<strong class="pad">' + name + '</strong> (<span class="type">'];

							// build type
							if (prop.$ref) {
								propModel.push(getClassName(prop));
								buffer.push(generateModel(swagger, prop));
							} else if (prop.type === 'array') {
								propModel.push('Array[');
								if (prop.items.$ref) {
									propModel.push(getClassName(prop.items));
									buffer.push(generateModel(swagger, prop.items));
								} else {
									propModel.push(getType(prop.items));
								}
								propModel.push(']');
							} else {
								propModel.push(getType(prop));
							}
							propModel.push('</span>');
							// is required ?
							if (!isRequired(def, name)) {
								propModel.push(', ', '<em>optional</em>');
							}
							propModel.push(')');
							// has description
							if (prop.description) {
								propModel.push(': ', prop.description);
							}
							// is enum
							if (prop.enum) {
								propModel.push(' = ', angular.toJson(prop.enum).replace(/,/g, ' or '));
							}
							propModel.push(',');
							strModel.push(propModel.join(''));
						}
						strModel.push('<strong>}</strong>');
						strModel.push(buffer.join(''));
						// cache generated object
						modelCache[schema.$ref] = strModel.join('\n');
					}
					model = modelCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				model = '<strong>array {\n\n}</strong>';
			}
			return model;
		};

		/**
		 * clears generated models cache
		 */
		this.clearCache = function() {
			objCache = {};
			modelCache = {};
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