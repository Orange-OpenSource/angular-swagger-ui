/*
 * Orange angular-swagger-ui - v0.2.4
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swagger2JsonParser', ['$q', '$sce', '$location', 'swaggerModel', function($q, $sce, $location, swaggerModel) {

		var swagger,
			trustedSources;

		function trustHtml(text) {
			var trusted = text;
			if (typeof text === 'string' && trustedSources) {
				trusted = $sce.trustAsHtml(escapeChars(text));
			}
			// else ngSanitize MUST be added to app
			return trusted;
		}

		function escapeChars(text) {
			return text && text
				.replace(/&/g, '&amp;')
				.replace(/<([^\/a-zA-Z])/g, '&lt;$1')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');
		}

		function computeParameters(pathParameters, operation) {
			var i, j, k, l,
				operationParameters = operation.parameters || [],
				parameters = [].concat(operationParameters),
				found,
				pathParameter,
				operationParameter;

			for (i = 0, l = pathParameters.length; i < l; i++) {
				found = false;
				pathParameter = swaggerModel.resolveReference(swagger, pathParameters[i]);

				for (j = 0, k = operationParameters.length; j < k; j++) {
					operationParameter = swaggerModel.resolveReference(swagger, operationParameters[j]);
					if (pathParameter.name === operationParameter.name && pathParameter.in === operationParameter.in) {
						// overriden parameter
						found = true;
						break;
					}
				}
				if (!found) {
					// add path parameter to operation ones
					parameters.push(pathParameter);
				}
			}
			return parameters;
		}

		/**
		 * parses swagger description to ease HTML generation
		 */
		function parseSwagger2Json(url, deferred, parseResult) {

			var i, l,
				operationId = 0,
				paramId = 0,
				map = {},
				form = {},
				resources = [],
				infos = swagger.info,
				openPath = $location.search().swagger,
				defaultContentType = 'application/json',
				a = angular.element('<a href="' + url + '"></a>')[0];

			// build URL params
			swagger.schemes = [swagger.schemes && swagger.schemes[0] || a.protocol.replace(':','')];
			swagger.host = swagger.host || a.host;
			swagger.consumes = swagger.consumes || [defaultContentType];
			swagger.produces = swagger.produces || [defaultContentType];

			// build main infos
			infos.scheme = swagger.schemes[0];
			infos.basePath = swagger.basePath;
			infos.host = swagger.host;
			infos.description = trustHtml(infos.description);

			// parse resources
			if (!swagger.tags) {
				resources.push({
					name: 'default',
					open: true
				});
				map['default'] = 0;
			} else {
				for (i = 0, l = swagger.tags.length; i < l; i++) {
					var tag = swagger.tags[i];
					resources.push(tag);
					map[tag.name] = i;
				}
			}
			// parse operations
			for (var path in swagger.paths) {
				var pathObject = swagger.paths[path],
					pathParameters = pathObject.parameters || [];

				delete pathObject.parameters;
				for (var httpMethod in pathObject) {
					var operation = pathObject[httpMethod];
					//TODO manage 'deprecated' operations ?
					operation.id = operationId;
					operation.description = trustHtml(operation.description);
					operation.produces = operation.produces || swagger.produces;
					form[operationId] = {
						responseType: defaultContentType
					};
					operation.httpMethod = httpMethod;
					operation.path = path;
					// parse operation's parameters
					var parameters = operation.parameters = computeParameters(pathParameters, operation);
					for (i = 0, l = parameters.length; i < l; i++) {
						//TODO manage 'collectionFormat' (csv, multi etc.) ?
						//TODO manage constraints (pattern, min, max etc.) ?
						var param = parameters[i] = swaggerModel.resolveReference(swagger, parameters[i]);
						param.id = paramId;
						param.type = swaggerModel.getType(param);
						param.description = trustHtml(param.description);
						if (param.items && param.items.enum) {
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
							operation.consumes = operation.consumes || swagger.consumes;
							form[operationId].contentType = operation.consumes.length === 1 ? operation.consumes[0] : defaultContentType;
						}
						paramId++;
					}
					// parse operation's responses
					if (operation.responses) {
						for (var code in operation.responses) {
							//TODO manage response headers
							var resp = operation.responses[code];
							resp.description = trustHtml(resp.description);
							if (resp.schema) {
								resp.schema.json = resp.examples && resp.examples[operation.produces[0]] || swaggerModel.generateSampleJson(swagger, resp.schema);
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
					operation.open = openPath && openPath === operation.operationId || openPath === res.name + '*';
					res.operations = res.operations || [];
					res.operations.push(operation);
					if (operation.open) {
						res.open = true;
					}
					operationId++;
				}
			}
			// cleanup resources
			for (i = 0; i < resources.length; i++) {
				var res = resources[i],
					operations = resources[i].operations;

				res.open = res.open || openPath === res.name || openPath === res.name + '*';
				if (!operations || (operations && operations.length === 0)) {
					resources.splice(i--, 1);
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
			parseResult.infos = infos;
			parseResult.resources = resources;
			parseResult.form = form;
			deferred.resolve(true);
		}

		/**
		 * Module entry point
		 */
		this.execute = function(parserType, url, contentType, data, isTrustedSources, parseResult) {
			var deferred = $q.defer();
			if (data.swagger === '2.0' && (parserType === 'json' || (parserType === 'auto' && contentType === 'application/json'))) {
				swagger = data;
				trustedSources = isTrustedSources;
				// try {
				parseSwagger2Json(url, deferred, parseResult);
				// } catch (e) {
				// 	deferred.reject({
				// 		code: 500,
				// 		message: 'failed to parse swagger: ' + e.message
				// 	});
				// }
			} else {
				deferred.resolve(false);
			}
			return deferred.promise;
		};

	}]);