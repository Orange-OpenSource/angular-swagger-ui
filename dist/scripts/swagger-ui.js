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
/*
 * angular-swagger-ui
 * http://github.com/maales/angular-swagger-ui
 * Version: 0.1.0 - 2015-02-26
 * License: MIT
 */
'use strict';

angular
	.module('swaggerUi')
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

	}]);

/*
 * angular-swagger-ui
 * http://github.com/maales/angular-swagger-ui
 * Version: 0.1.0 - 2015-02-26
 * License: MIT
 */
'use strict';

angular
	.module('swaggerUi')
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

	}]);

angular.module('swaggerUiTemplates', ['templates/swagger-ui.html']);

angular.module('templates/swagger-ui.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('templates/swagger-ui.html',
    '<div class="swagger-ui" aria-live="polite" aria-relevant="additions removals"> <div class="api-name"> <h3 ng-bind="infos.title"></h3> </div> <div class="api-description" ng-bind-html="infos.description"></div> <div class="api-infos"> <div class="api-infos-contact" ng-if="infos.contact"> <a href="{{infos.contact.url}}">contact the developer</a> </div> <div class="api-infos-license" ng-if="infos.license"> <span>license: </span><a href="{{infos.license.url}}" ng-bind="infos.license.name"></a> </div> </div> <ul class="list-unstyled endpoints"> <li ng-repeat="api in resources" class="endpoint" ng-class="{active:api.open}"> <div class="clearfix"> <ul class="list-inline pull-left endpoint-heading"> <li> <h4> <a href="javascript:;" ng-click="api.open=!api.open" ng-bind="api.name"></a> <span ng-if="api.description"> : <span ng-bind="api.description"></span></span> </h4> </li> </ul> <ul class="list-inline pull-right endpoint-actions"> <li> <a href="javascript:;" ng-click="api.open=!api.open">open/hide</a> </li> <li> <a href="javascript:;" ng-click="expand(api)">list operations</a> </li> <li> <a href="javascript:;" ng-click="expand(api,true)">expand all</a> </li> </ul> </div> <ul class="list-unstyled collapse" ng-class="{in:api.open}"> <li ng-repeat="op in api.operations" class="operation {{op.httpMethod}}"> <div class="heading"> <a ng-click="op.open=!op.open" href="javascript:;"> <div> <span class="http-method text-uppercase" ng-bind="op.httpMethod"></span> <span class="path" ng-bind="op.path"></span> <span class="description pull-right" ng-bind="op.summary"></span> </div> </a> </div> <div class="content collapse" ng-class="{in:op.open}"> <div ng-if="op.description"> <h5>implementation notes</h5> <p ng-bind="op.description"></p> </div> <form role="form" name="tryItForm" ng-submit="tryItForm.$valid&&submitTryIt(op)"> <div ng-if="op.responseClass" class="response"> <h5>response class (status {{op.responseClass.status}})</h5> <div ng-if="op.responseClass.display!==-1"> <ul class="list-inline schema"> <li><a href="javascript:;" ng-click="op.responseClass.display=0" ng-class="{active:op.responseClass.display===0}">model</a></li> <li><a href="javascript:;" ng-click="op.responseClass.display=1" ng-class="{active:op.responseClass.display===1}">model schema</a></li> </ul> <pre class="model" ng-if="op.responseClass.display===0" ng-bind-html="op.responseClass.model"></pre> <pre ng-if="op.responseClass.display===1" ng-bind="op.responseClass.json"></pre> </div> <div ng-if="op.produces"> <label for="responseContentType{{op.id}}">response content type</label> <select ng-model="form[op.id].responseType" ng-options="item for item in op.produces track by item" id="responseContentType{{op.id}}" name="responseContentType{{op.id}}" required></select> </div> </div> <div ng-if="op.parameters" class="table-responsive"> <h5>parameters</h5> <table class="table table-condensed parameters"> <thead> <tr> <th class="name">parameter <th class="value">value <th class="desc">description <th class="type">parameter type <th class="data">data type   <tbody> <tr ng-repeat="param in op.parameters"> <td ng-class="{bold:param.required}"> <label for="param{{param.id}}" ng-bind="param.name"></label>  <td ng-class="{bold:param.required}"> <div ng-if="tryIt"> <div ng-if="param.in!==\'body\'" ng-switch="param.type"> <input ng-switch-when="file" type="file" file-input ng-model="form[op.id][param.name]" id="param{{param.id}}" placeholder="{{param.required?\'(required)\':\'\'}}" ng-required="param.required"> <input ng-switch-default type="text" ng-model="form[op.id][param.name]" id="param{{param.id}}" placeholder="{{param.required?\'(required)\':\'\'}}" ng-required="param.required"> </div> <div ng-if="param.in===\'body\'"> <textarea id="param{{param.id}}" ng-model="form[op.id][param.name]" ng-required="param.required"></textarea> <br> <div ng-if="op.consumes"> <label for="bodyContentType{{op.id}}">parameter content type</label> <select ng-model="form[op.id].contentType" id="bodyContentType{{op.id}}" name="bodyContentType{{op.id}}" ng-options="item for item in op.consumes track by item"></select> </div> </div> </div> <div ng-if="!tryIt"> <div ng-if="param.in!==\'body\'"> <div ng-if="param.default"><span ng-bind="param.default"></span> (default)</div> <div ng-if="param.required"><strong>(required)</strong></div> </div> </div>  <td ng-class="{bold:param.required}" ng-bind="param.description"> <td ng-bind="param.in"> <td ng-if="param.type" ng-switch="param.type"> <span ng-switch-when="array" ng-bind="\'Array[\'+param.items.type+\']\'"></span> <span ng-switch-default ng-bind="param.type"></span>  <td ng-if="param.schema"> <ul class="list-inline schema"> <li><a href="javascript:;" ng-click="param.schema.display=0" ng-class="{active:param.schema.display===0}">model</a></li> <li><a href="javascript:;" ng-click="param.schema.display=1" ng-class="{active:param.schema.display===1}">model schema</a></li> </ul> <pre class="model" ng-if="param.schema.display===0&&param.schema.model" ng-bind-html="param.schema.model"></pre> <div ng-if="param.schema.display===1&&param.schema.json"> <pre ng-bind="param.schema.json" ng-click="form[op.id][param.name]=param.schema.json" aria-described-by="help-{{param.id}}"></pre> <div id="help-{{param.id}}">click to set as parameter value</div> </div>    </table> </div> <div class="table-responsive"> <h5>response messages</h5> <table class="table responses"> <thead> <tr> <th class="code">HTTP status code <th>reason <th>response model   <tbody> <tr ng-repeat="(code, resp) in op.responses"> <td ng-bind="code"> <td ng-bind-html="resp.description"> <td> <pre ng-if="resp.schema&&resp.schema.json" ng-bind="resp.schema.json"></pre>    </table> </div> <div ng-if="tryIt"> <button class="btn btn-default" ng-click="op.tryItResult=false;op.hideTryItResult=false" type="submit" ng-disabled="op.loading" ng-bind="op.loading?\'loading...\':\'try it out!\'"></button> <a class="hide-try-it" ng-if="op.tryItResult&&!op.hideTryItResult" ng-click="op.hideTryItResult=true" href="javascript:;">hide response</a> </div> </form> <div ng-if="op.tryItResult" ng-show="!op.hideTryItResult"> <h5>request URL</h5> <pre ng-bind="op.tryItResult.url"></pre> <h5>response body</h5> <pre ng-bind="op.tryItResult.response.body"></pre> <h5>response code</h5> <pre ng-bind="op.tryItResult.response.status"></pre> <h5>response headers</h5> <pre ng-bind="op.tryItResult.response.headers"></pre> </div> </div> </li> </ul> </li> </ul> </div>');
}]);
