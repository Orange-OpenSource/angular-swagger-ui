/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerParser', function($q, $sce, $location, swaggerModel, swaggerTranslator) {

		var HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'],
			trustedSources,
			operationId,
			paramId;

		/**
		 * Module entry point
		 */
		this.execute = function(data) {
			var deferred = $q.defer();
			if (data.openApiSpec && data.openApiSpec.swagger === '2.0' && (data.parser === 'json' || (data.parser === 'auto' && data.contentType === 'application/json'))) {
				trustedSources = data.trustedSources;
				try {
					parseSwagger2Json(deferred, data);
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
		function parseSwagger2Json(deferred, data) {
			var map = {},
				form = {},
				resources = [],
				infos = data.openApiSpec.info,
				openPath = $location.hash(),
				defaultContentType = 'application/json',
				sortResources = !data.openApiSpec.tags;

			operationId = 0;
			paramId = 0;
			parseInfos(data.openApiSpec, data.url, infos, defaultContentType);
			parseTags(data.openApiSpec, resources, map);
			parseOperations(data.openApiSpec, resources, form, map, defaultContentType, openPath);
			swaggerModel.resolveInheritance(data.openApiSpec);
			cleanUp(resources, openPath, sortResources);
			// prepare result
			data.ui = {
				infos: infos,
				form: form,
				resources: resources
			};
			deferred.resolve(true);
		}

		/**
		 * parse main infos
		 */
		function parseInfos(openApiSpec, url, infos, defaultContentType) {
			// build URL params
			var a = angular.element('<a href="' + url + '"></a>')[0];
			openApiSpec.schemes = [openApiSpec.schemes && openApiSpec.schemes[0] || a.protocol.replace(':', '')];
			openApiSpec.host = openApiSpec.host || a.host;
			openApiSpec.consumes = openApiSpec.consumes || [defaultContentType];
			openApiSpec.produces = openApiSpec.produces || [defaultContentType];
			// build main infos
			infos.scheme = openApiSpec.schemes[0];
			infos.schemes = openApiSpec.schemes;
			infos.basePath = openApiSpec.basePath;
			infos.host = openApiSpec.host;
			infos.description = trustHtml(infos.description);
			infos.externalDocs = openApiSpec.externalDocs;
			if (infos.externalDocs) {
				infos.externalDocs.description = trustHtml(infos.externalDocs.description);
			}
		}

		/**
		 * parse tags
		 */
		function parseTags(openApiSpec, resources, map) {
			var i, l, tag;
			if (!openApiSpec.tags) {
				resources.push({
					name: 'default',
					open: true
				});
				map['default'] = 0;
			} else {
				for (i = 0, l = openApiSpec.tags.length; i < l; i++) {
					tag = openApiSpec.tags[i];
					resources.push(tag);
					map[tag.name] = i;
				}
			}
		}

		/**
		 * parse operations
		 */
		function parseOperations(openApiSpec, resources, form, map, defaultContentType, openPath) {
			var i,
				path,
				pathObject,
				pathParameters,
				httpMethod,
				operation,
				tag,
				resource;

			for (path in openApiSpec.paths) {
				pathObject = openApiSpec.paths[path] = swaggerModel.resolveReference(openApiSpec, openApiSpec.paths[path]);
				pathParameters = pathObject.parameters || [];
				delete pathObject.parameters;
				for (httpMethod in pathObject) {
					if (HTTP_METHODS.indexOf(httpMethod) >= 0) {
						operation = pathObject[httpMethod];
						operation.description = trustHtml(operation.description);
						operation.produces = operation.produces || openApiSpec.produces;
						form[operationId] = {
							responseType: operation.produces && operation.produces[0] || defaultContentType
						};
						operation.httpMethod = httpMethod;
						operation.path = path;
						operation.security = operation.security || openApiSpec.security;
						parseParameters(openApiSpec, operation, pathParameters, form, defaultContentType, openPath);
						parseResponses(openApiSpec, operation, openPath);
						operation.tags = operation.tags || ['default'];
						// map operation to resources
						for (i = 0; i < operation.tags.length; i++) {
							tag = operation.tags[i];
							if (typeof map[tag] === 'undefined') {
								map[tag] = resources.length;
								resources.push({
									name: tag
								});
							}
							resource = resources[map[tag]];
							resource.operations = resource.operations || [];
							operation.id = operationId++;
							operation.operationId = operation.operationId || ('operation-' + operation.id);
							operation.open = openPath && (openPath.match(new RegExp(operation.operationId + '$|' + operation.operationId + '-(default|parameter|response)-model-.*|' + resource.name + '\\*$')));
							resource.operations.push(angular.copy(operation));
							if (operation.open) {
								resource.open = true;
							}
						}
					}
				}
			}
		}

		/**
		 * compute path and operation parameters
		 */
		function computeParameters(openApiSpec, pathParameters, operation) {
			var i, j, k, l,
				operationParameters = operation.parameters || [],
				parameters = [].concat(operationParameters),
				found,
				pathParameter,
				operationParameter;

			for (i = 0, l = pathParameters.length; i < l; i++) {
				found = false;
				pathParameter = swaggerModel.resolveReference(openApiSpec, pathParameters[i]);

				for (j = 0, k = operationParameters.length; j < k; j++) {
					operationParameter = swaggerModel.resolveReference(openApiSpec, operationParameters[j]);
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
		function parseParameters(openApiSpec, operation, pathParameters, form, defaultContentType, openPath) {
			var i, l,
				param,
				openModel,
				parameters = operation.parameters = computeParameters(openApiSpec, pathParameters, operation);

			for (i = 0, l = parameters.length; i < l; i++) {
				//TODO manage 'collectionFormat' (csv, multi etc.) ?
				//TODO manage constraints (pattern, min, max etc.) ?
				param = parameters[i] = swaggerModel.resolveReference(openApiSpec, parameters[i]);
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
					openModel = openPath && openPath.match(new RegExp(operation.operationId + '-parameter-model-.*'));
					param.schema.display = openModel ? 0 : 1;
				}
				// fix consumes
				if (param.in === 'body') {
					operation.consumes = operation.consumes || openApiSpec.consumes || [defaultContentType];
					form[operationId].contentType = operation.consumes && operation.consumes[0];
				} else if (param.in === 'formData') {
					operation.consumes = operation.consumes || [param.subtype === 'file' ? 'multipart/form-data' : 'application/x-www-form-urlencoded'];
					form[operationId].contentType = operation.consumes && operation.consumes[0];
				}
				if (param.schema && operation.consumes && operation.consumes.indexOf('application/xml') >= 0) {
					param.schema.xml = swaggerModel.generateSampleXml(openApiSpec, param.schema);
				}
				paramId++;
			}
		}

		/**
		 * parse operation responses
		 */
		function parseResponses(openApiSpec, operation, openPath) {
			var code,
				response,
				openModel;

			if (operation.responses) {
				for (code in operation.responses) {
					response = operation.responses[code] = swaggerModel.resolveReference(openApiSpec, operation.responses[code]);
					response.description = trustHtml(response.description);
					if (response.schema) {
						// if (response.examples && response.examples[operation.produces[0]]) {
						// 	sampleJson = angular.toJson(response.examples[operation.produces[0]], true);
						// } else {
						// 	sampleJson = swaggerModel.generateSampleJson(openApiSpec, response.schema);
						// }
						// response.schema.json = sampleJson;
						// if (operation.produces && operation.produces.indexOf('application/xml') >= 0) {
						// 	response.schema.xml = swaggerModel.generateSampleXml(openApiSpec, response.schema);
						// }
						// model = swaggerModel.generateModel(openApiSpec, response.schema, operation.operationId);
						if (code === '200' || code === '201') {
							operation.responseClass = response;
							openModel = openPath && openPath.match(new RegExp(operation.operationId + '-default-model-.*'));
							operation.responseClass.display = openModel ? 0 : 1;
							operation.responseClass.status = code;
							parseHeaders(openApiSpec, operation, response);
							delete operation.responses[code];
						} else {
							openModel = openPath && openPath.match(new RegExp(operation.operationId + '-response-model-.*'));
							response.display = openModel ? 0 : 1;
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
		function parseHeaders(openApiSpec, operation, response) {
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

		function cleanUp(resources, openPath, sortResources) {
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
			if (sortResources) {
				// sort resources alphabeticaly
				resources.sort(function(a, b) {
					if (a.name > b.name) {
						return 1;
					} else if (a.name < b.name) {
						return -1;
					}
					return 0;
				});
			}
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
		swaggerModules.add(swaggerModules.PARSE, swaggerParser, 1);
	});