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
/*
 * Orange angular-swagger-ui - v0.1.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerClient', ['$q', '$http', function($q, $http) {

		function formatResult(deferred, data, status, headers, config) {
			var query = '';
			if (config.params) {
				var parts = [];
				for (var key in config.params) {
					parts.push(key + '=' + encodeURIComponent(config.params[key]));
				}
				if (parts.length > 0) {
					query = '?' + parts.join('&');
				}
			}
			deferred.resolve({
				url: config.url + query,
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

	}]);
/*
 * Orange angular-swagger-ui - v0.1.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerModel', function() {

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
			if (schema.default || schema.example){
				sample = schema.default || schema.example;
			} else if (schema.properties) {
				sample = {};
				for (var name in schema.properties) {
					sample[name] = getSampleObj(swagger, schema.properties[name]);
				}
			} else if (schema.$ref) {
				// complex object
				var def = swagger.definitions && swagger.definitions[getClassName(schema)];
				if (def) {
					if (!objCache[schema.$ref]) {
						// object not in cache
						objCache[schema.$ref] = getSampleObj(swagger, def);
					}
					sample = objCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				sample = [getSampleObj(swagger, schema.items)];
			} else if (schema.type === 'object') {
				sample = {};
			} else {
				sample = getSampleValue(getType(schema));
			}
			return sample;
		}

		/**
		 * generates a sample value for a basic type
		 */
		function getSampleValue(type) {
			var result;
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
					result = (new Date()).toISOString().split('T')[0];
					break;
				case 'date-time':
					result = (new Date()).toISOString();
					break;
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

		var countInLine = 0;

		/**
		 * generates object's model
		 */
		var generateModel = this.generateModel = function(swagger, schema, modelName) {
			var model = '';

			function isRequired(item, name) {
				return item.required && item.required.indexOf(name) !== -1;
			}

			if (schema.properties) {
				modelName = modelName || ('Inline Model' + countInLine++);
				var buffer = ['<div><strong>' + modelName + ' {</strong>'],
					submodels = [];

				for (var propertyName in schema.properties) {
					var property = schema.properties[propertyName];
					buffer.push('<div class="pad"><strong>', propertyName, '</strong> (<span class="type">');
					// build type
					if (property.properties) {
						var name = 'Inline Model' + countInLine++;
						buffer.push(name);
						submodels.push(generateModel(swagger, property, name));
					} else if (property.$ref) {
						buffer.push(getClassName(property));
						submodels.push(generateModel(swagger, property));
					} else if (property.type === 'array') {
						buffer.push('Array[');
						if (property.items.properties) {
							var name = 'Inline Model' + countInLine++;
							buffer.push(name);
							submodels.push(generateModel(swagger, property, name));
						} else if (property.items.$ref) {
							buffer.push(getClassName(property.items));
							submodels.push(generateModel(swagger, property.items));
						} else {
							buffer.push(getType(property.items));
						}
						buffer.push(']');
					} else {
						buffer.push(getType(property));
					}
					buffer.push('</span>');
					// is required ?
					if (!isRequired(schema, propertyName)) {
						buffer.push(', ', '<em>optional</em>');
					}
					buffer.push(')');
					// has description
					if (property.description) {
						buffer.push(': ', property.description);
					}
					// is enum
					if (property.enum) {
						buffer.push(' = ', angular.toJson(property.enum).replace(/,/g, ' or '));
					}
					buffer.push(',</div>');
				}
				buffer.pop();
				buffer.push('</div>');
				buffer.push('<strong>}</strong>');
				buffer.push(submodels.join(''), '</div>');
				model = buffer.join('');
			} else if (schema.$ref) {
				var className = getClassName(schema),
					def = swagger.definitions && swagger.definitions[className];

				if (def) {
					if (!modelCache[schema.$ref]) {
						// cache generated object
						modelCache[schema.$ref] = generateModel(swagger, def, className);
					}
					model = modelCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				var buffer = ['<strong>Array ['];
				var sub = '';
				if (schema.items.properties) {
					var name = 'Inline Model' + countInLine++;
					buffer.push(name);
					sub = generateModel(swagger, schema.items, name);
				} else if (schema.items.$ref) {
					buffer.push(getClassName(schema.items));
					sub = generateModel(swagger, schema.items);
				} else {
					buffer.push(getType(schema.items));
				}
				buffer.push(']</strong><br><br>', sub);
				model = buffer.join('');
			} else if (schema.type === 'object') {
				model = '<strong>Inline Model {<br>}</strong>';
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

	});
angular.module('swaggerUiTemplates', ['templates/swagger-ui.html']);

angular.module('templates/swagger-ui.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('templates/swagger-ui.html',
    '<div class="swagger-ui" aria-live="polite" aria-relevant="additions removals"> <h3 class="swagger-loading" ng-if="loading">loading ...</h3> <div class="api-name"> <h3 ng-bind="infos.title"></h3> </div> <div class="api-description" ng-bind-html="infos.description"></div> <div class="api-infos"> <div class="api-infos-contact" ng-if="infos.contact"> <div ng-if="infos.contact.name" class="api-infos-contact-name">created by <span ng-bind="infos.contact.name"></span></div> <div ng-if="infos.contact.url" class="api-infos-contact-url">see more at <a href="{{infos.contact.url}}" ng-bind="infos.contact.url"></a></div> <a ng-if="infos.contact.email" class="api-infos-contact-url" href="mailto:{{infos.contact.email}}?subject={{infos.title}}">contact the developer</a> </div> <div class="api-infos-license" ng-if="infos.license"> <span>license: </span><a href="{{infos.license.url}}" ng-bind="infos.license.name"></a> </div> </div> <ul class="list-unstyled endpoints"> <li ng-repeat="api in resources" class="endpoint" ng-class="{active:api.open}"> <div class="clearfix"> <ul class="list-inline pull-left endpoint-heading"> <li> <h4> <a href="javascript:;" ng-click="api.open=!api.open;permalink(api.open?api.name:null)" ng-bind="api.name"></a> <span ng-if="api.description"> : <span ng-bind="api.description"></span></span> </h4> </li> </ul> <ul class="list-inline pull-right endpoint-actions"> <li> <a href="javascript:;" ng-click="api.open=!api.open;permalink(api.open?api.name:null)">open/hide</a> </li> <li> <a href="javascript:;" ng-click="expand(api);permalink(api.name)">list operations</a> </li> <li> <a href="javascript:;" ng-click="expand(api,true);permalink(api.name+\'*\')">expand operations</a> </li> </ul> </div> <ul class="list-unstyled collapse operations" ng-class="{in:api.open}"> <li ng-repeat="op in api.operations" class="operation {{op.httpMethod}}"> <div class="heading"> <a ng-click="op.open=!op.open;permalink(op.open?op.operationId:null)" href="javascript:;"> <div class="clearfix"> <span class="http-method text-uppercase" ng-bind="op.httpMethod"></span> <span class="path" ng-bind="op.path"></span> <span class="description pull-right" ng-bind="op.summary"></span> </div> </a> </div> <div class="content collapse" ng-class="{in:op.open}"> <div ng-if="op.description"> <h5>implementation notes</h5> <p ng-bind="op.description"></p> </div> <form role="form" name="explorerForm" ng-submit="explorerForm.$valid&&submitExplorer(op)"> <div ng-if="op.responseClass" class="response"> <h5>response class (status {{op.responseClass.status}})</h5> <div ng-if="op.responseClass.display!==-1"> <ul class="list-inline schema"> <li><a href="javascript:;" ng-click="op.responseClass.display=0" ng-class="{active:op.responseClass.display===0}">model</a></li> <li><a href="javascript:;" ng-click="op.responseClass.display=1" ng-class="{active:op.responseClass.display===1}">model schema</a></li> </ul> <pre class="model" ng-if="op.responseClass.display===0" ng-bind-html="op.responseClass.schema.model"></pre> <pre class="model-schema" ng-if="op.responseClass.display===1" ng-bind="op.responseClass.schema.json"></pre> </div> <div ng-if="op.produces" class="content-type"> <label for="responseContentType{{op.id}}">response content type</label> <select ng-model="form[op.id].responseType" ng-options="item for item in op.produces track by item" id="responseContentType{{op.id}}" name="responseContentType{{op.id}}" required></select> </div> </div> <div ng-if="op.parameters&&op.parameters.length>0" class="table-responsive"> <h5>parameters</h5> <table class="table table-condensed parameters"> <thead> <tr> <th class="name">parameter <th class="value">value <th class="desc">description <th class="type">parameter type <th class="data">data type   <tbody> <tr ng-repeat="param in op.parameters"> <td ng-class="{bold:param.required}"> <label for="param{{param.id}}" ng-bind="param.name"></label>  <td ng-class="{bold:param.required}"> <div ng-if="apiExplorer"> <div ng-if="param.in!==\'body\'" ng-switch="param.subtype"> <input ng-switch-when="file" type="file" file-input ng-model="form[op.id][param.name]" id="param{{param.id}}" placeholder="{{param.required?\'(required)\':\'\'}}" ng-required="param.required"> <select ng-switch-when="enum" ng-model="form[op.id][param.name]" id="param{{param.id}}"> <option ng-repeat="value in param.enum" value="{{value}}" ng-bind="value+(param.default===value?\' (default)\':\'\')" ng-selected="param.default===value"> </select> <input ng-switch-default type="text" ng-model="form[op.id][param.name]" id="param{{param.id}}" placeholder="{{param.required?\'(required)\':\'\'}}" ng-required="param.required"> </div> <div ng-if="param.in===\'body\'"> <textarea id="param{{param.id}}" ng-model="form[op.id][param.name]" ng-required="param.required"></textarea> <br> <div ng-if="op.consumes" class="content-type"> <label for="bodyContentType{{op.id}}">parameter content type</label> <select ng-model="form[op.id].contentType" id="bodyContentType{{op.id}}" name="bodyContentType{{op.id}}" ng-options="item for item in op.consumes track by item"></select> </div> </div> </div> <div ng-if="!apiExplorer"> <div ng-if="param.in!==\'body\'"> <div ng-if="param.default"><span ng-bind="param.default"></span> (default)</div> <div ng-if="param.enum"> <span ng-repeat="value in param.enum">{{value}}<span ng-if="!$last"> or </span></span> </div> <div ng-if="param.required"><strong>(required)</strong></div> </div> </div>  <td ng-class="{bold:param.required}" ng-bind="param.description"> <td ng-bind="param.in"> <td ng-if="param.type" ng-switch="param.type"> <span ng-switch-when="array" ng-bind="\'Array[\'+param.items.type+\']\'"></span> <span ng-switch-default ng-bind="param.type"></span>  <td ng-if="param.schema"> <ul class="list-inline schema"> <li><a href="javascript:;" ng-click="param.schema.display=0" ng-class="{active:param.schema.display===0}">model</a></li> <li><a href="javascript:;" ng-click="param.schema.display=1" ng-class="{active:param.schema.display===1}">model schema</a></li> </ul> <pre class="model" ng-if="param.schema.display===0&&param.schema.model" ng-bind-html="param.schema.model"></pre> <div class="model-schema" ng-if="param.schema.display===1&&param.schema.json"> <pre ng-bind="param.schema.json" ng-click="form[op.id][param.name]=param.schema.json" aria-described-by="help-{{param.id}}"></pre> <div id="help-{{param.id}}">click to set as parameter value</div> </div>    </table> </div> <div class="table-responsive" ng-if="op.hasResponses"> <h5>response messages</h5> <table class="table responses"> <thead> <tr> <th class="code">HTTP status code <th>reason <th>response model   <tbody> <tr ng-repeat="(code, resp) in op.responses"> <td ng-bind="code"> <td ng-bind-html="resp.description"> <td> <ul ng-if="resp.schema&&resp.schema.model&&resp.schema.json" class="list-inline schema"> <li><a href="javascript:;" ng-click="resp.display=0" ng-class="{active:resp.display===0}">model</a></li> <li><a href="javascript:;" ng-click="resp.display=1" ng-class="{active:resp.display===1}">model schema</a></li> </ul> <pre class="model" ng-if="resp.display===0&&resp.schema&&resp.schema.model" ng-bind-html="resp.schema.model"></pre> <pre class="model-schema" ng-if="resp.display===1&&resp.schema&&resp.schema.json" ng-bind="resp.schema.json"></pre>    </table> </div> <div ng-if="apiExplorer"> <button class="btn btn-default" ng-click="op.explorerResult=false;op.hideExplorerResult=false" type="submit" ng-disabled="op.loading" ng-bind="op.loading?\'loading...\':\'try it out!\'"></button> <a class="hide-try-it" ng-if="op.explorerResult&&!op.hideExplorerResult" ng-click="op.hideExplorerResult=true" href="javascript:;">hide response</a> </div> </form> <div ng-if="op.explorerResult" ng-show="!op.hideExplorerResult"> <h5>request URL</h5> <pre ng-bind="op.explorerResult.url"></pre> <h5>response body</h5> <pre ng-bind="op.explorerResult.response.body"></pre> <h5>response code</h5> <pre ng-bind="op.explorerResult.response.status"></pre> <h5>response headers</h5> <pre ng-bind="op.explorerResult.response.headers"></pre> </div> </div> </li> </ul> </li> </ul> <div class="api-version" ng-if="infos"> [BASE URL: <span class="h4" ng-bind="infos.basePath"></span>, API VERSION: <span class="h4" ng-bind="infos.version"></span>, HOST: <span class="h4" ng-bind="infos.scheme"></span>://<span class="h4" ng-bind="infos.host"></span>] </div> </div>');
}]);
