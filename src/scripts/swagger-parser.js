/*
 * Orange angular-swagger-ui - v0.3.2
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerParser', function($q, $sce, $location, swaggerModel, swaggerTranslator) {

		var trustedSources,
			operationId,
			paramId;

		/**
		 * Module entry point
		 */
		this.execute = function(parserType, url, contentType, data, isTrustedSources, parseResult) {
			var deferred = $q.defer();
			if (data.swagger === '2.0' && (parserType === 'json' || (parserType === 'auto' && contentType === 'application/json'))) {
				trustedSources = isTrustedSources;
				try {
					parseSwagger2Json(data, url, deferred, parseResult);
				} catch (e) {
					deferred.reject({
						code: 500,
						message: swaggerTranslator.translate('errorParseFailed', e)
					});
				}
			} else {
				deferred.resolve(false);
			}
			return deferred.promise;
		};

		/**
		 * parse swagger description to ease HTML generation
		 */
		function parseSwagger2Json(swagger, url, deferred, parseResult) {
			var map = {},
				form = {},
				resources = [],
				infos = swagger.info,
				openPath = $location.hash(),
				defaultContentType = 'application/json';

			operationId = 0;
			paramId = 0;
			parseInfos(swagger, url, infos, defaultContentType);
			parseTags(swagger, resources, map);
			parseOperations(swagger, resources, form, map, defaultContentType, openPath);
			cleanUp(resources, openPath);
			// prepare result
			parseResult.infos = infos;
			parseResult.resources = resources;
			parseResult.form = form;
			deferred.resolve(true);
		}

		/**
		 * parse main infos
		 */
		function parseInfos(swagger, url, infos, defaultContentType) {
			// build URL params
			var a = angular.element('<a href="' + url + '"></a>')[0];
			swagger.schemes = [swagger.schemes && swagger.schemes[0] || a.protocol.replace(':', '')];
			swagger.host = swagger.host || a.host;
			swagger.consumes = swagger.consumes || [defaultContentType];
			swagger.produces = swagger.produces || [defaultContentType];
			// build main infos
			infos.scheme = swagger.schemes[0];
			infos.basePath = swagger.basePath;
			infos.host = swagger.host;
			infos.description = trustHtml(infos.description);
		}

		/**
		 * parse tags
		 */
		function parseTags(swagger, resources, map) {
			var i, l, tag;
			if (!swagger.tags) {
				resources.push({
					name: 'default',
					open: true
				});
				map['default'] = 0;
			} else {
				for (i = 0, l = swagger.tags.length; i < l; i++) {
					tag = swagger.tags[i];
					resources.push(tag);
					map[tag.name] = i;
				}
			}
		}

		/**
		 * parse operations
		 */
		function parseOperations(swagger, resources, form, map, defaultContentType, openPath) {
			var path,
				pathObject,
				pathParameters,
				httpMethod,
				operation,
				tag,
				resource;

			for (path in swagger.paths) {
				pathObject = swagger.paths[path];
				pathParameters = pathObject.parameters || [];
				delete pathObject.parameters;
				for (httpMethod in pathObject) {
					operation = pathObject[httpMethod];
					//TODO manage 'deprecated' operations ?
					operation.id = operationId;
					operation.description = trustHtml(operation.description);
					operation.produces = operation.produces || swagger.produces;
					form[operationId] = {
						responseType: defaultContentType
					};
					operation.httpMethod = httpMethod;
					operation.path = path;
					parseParameters(swagger, operation, pathParameters, form, defaultContentType);
					parseResponses(swagger, operation);
					operation.tags = operation.tags || ['default'];
					// map operation to resource
					tag = operation.tags[0];
					if (typeof map[tag] === 'undefined') {
						map[tag] = resources.length;
						resources.push({
							name: tag
						});
					}
					resource = resources[map[operation.tags[0]]];
					operation.open = openPath && openPath === operation.operationId || openPath === resource.name + '*';
					resource.operations = resource.operations || [];
					resource.operations.push(operation);
					if (operation.open) {
						resource.open = true;
					}
					operationId++;
				}
			}
		}

		/**
		 * compute path and operation parameters
		 */
		function computeParameters(swagger, pathParameters, operation) {
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
		 * parse operation parameters
		 */
		function parseParameters(swagger, operation, pathParameters, form, defaultContentType) {
			var i, l,
				param,
				parameters = operation.parameters = computeParameters(swagger, pathParameters, operation);

			for (i = 0, l = parameters.length; i < l; i++) {
				//TODO manage 'collectionFormat' (csv, multi etc.) ?
				//TODO manage constraints (pattern, min, max etc.) ?
				param = parameters[i] = swaggerModel.resolveReference(swagger, parameters[i]);
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
				if (param.in === 'body' || param.in === 'formData') {
					operation.consumes = operation.consumes || swagger.consumes;
					form[operationId].contentType = operation.consumes.length === 1 ? operation.consumes[0] : defaultContentType;
				}
				paramId++;
			}
		}

		/**
		 * parse operation responses
		 */
		function parseResponses(swagger, operation) {
			var code,
				response,
				sampleJson;

			if (operation.responses) {
				for (code in operation.responses) {
					response = operation.responses[code] = swaggerModel.resolveReference(swagger, operation.responses[code]);
					response.description = trustHtml(response.description);
					if (response.schema) {
						if (response.examples && response.examples[operation.produces[0]]) {
							sampleJson = angular.toJson(response.examples[operation.produces[0]], true);
						} else {
							sampleJson = swaggerModel.generateSampleJson(swagger, response.schema);
						}
						response.schema.json = sampleJson;
						if (response.schema.type === 'object' || response.schema.type === 'array' || response.schema.$ref) {
							response.display = 1; // display schema
							response.schema.model = $sce.trustAsHtml(swaggerModel.generateModel(swagger, response.schema));
						} else if (response.schema.type === 'string') {
							delete response.schema;
						}
						if (code === '200' || code === '201') {
							operation.responseClass = response;
							operation.responseClass.display = 1;
							operation.responseClass.status = code;
							parseHeaders(swagger, operation, response);
							delete operation.responses[code];
						} else {
							operation.hasResponses = true;
						}
					} else {
						operation.hasResponses = true;
					}
				}
			}
		}

		/**
		 * parse operation response headers
		 */
		function parseHeaders(swagger, operation, response) {
			if (response.headers) {
				operation.headers = response.headers;
				for (var name in operation.headers) {
					var header = operation.headers[name];
					header.type = swaggerModel.getType(header);
					if (header.type === 'array') {
						header.type = 'Array[' + swaggerModel.getType(header.items) + ']';
					}
					header.description = trustHtml(header.description);
				}
				delete response.headers;
			}
		}

		function cleanUp(resources, openPath) {
			var i,
				resource,
				operations;

			for (i = 0; i < resources.length; i++) {
				resource = resources[i];
				operations = resources[i].operations;
				resource.open = resource.open || openPath === resource.name || openPath === resource.name + '*';
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
			swaggerModel.clearCache();
		}

		function trustHtml(text) {
			var trusted = text;
			if (typeof text === 'string' && trustedSources) {
				trusted = $sce.trustAsHtml(escapeChars(text));
			}
			// else ngSanitize MUST be added to app
			return trusted;
		}

		function escapeChars(text) {
			return text
				.replace(/&/g, '&amp;')
				.replace(/<([^\/a-zA-Z])/g, '&lt;$1')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');
		}

	})
	.run(function(swaggerModules, swaggerParser) {
		swaggerModules.add(swaggerModules.PARSE, swaggerParser);
	});