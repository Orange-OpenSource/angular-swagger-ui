/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swagger1Converter', function($q, swaggerModules, swaggerLoader) {

		/**
		 * Module entry point
		 */
		this.execute = function(data) {
			var deferred = $q.defer(),
				version = data.openApiSpec && data.openApiSpec.swaggerVersion;

			if (version === '1.2' && (data.parser === 'json' || (data.parser === 'auto' && data.contentType === 'application/json'))) {
				convert(deferred, data);
			} else {
				deferred.resolve(false);
			}
			return deferred.promise;
		};

		/**
		 * Transforms Swagger 1 to Swagger 2
		 */
		function convert(deferred, data) {
			var info = data.openApiSpec.info || {},
				promises = [],
				swaggerResourceName;

			info.contact = {
				email: info.contact
			};
			info.license = {
				name: info.license,
				url: info.licenseUrl
			};
			info.termsOfService = info.termsOfServiceUrl;

			data.openApiSpec.info = info;
			data.openApiSpec.paths = {};
			data.openApiSpec.definitions = {};
			data.openApiSpec.tags = [];
			data.openApiSpec.swagger = '2.0';

			// load files
			angular.forEach(data.openApiSpec.apis, function(api) {
				var url = data.url;
				if (url.match(/(.*)\?(.*)/)) {
					url = url.replace(/(.*)\?(.*)/, '$1' + api.path + '?$2');
				} else {
					url += api.path;
				}
				promises.push(swaggerLoader.get({
					url: url
				}));
			});

			convertSecurityDefinitions(data.openApiSpec);

			$q.all(promises)
				.then(function(results) {
					swaggerModules
						.execute(swaggerModules.BEFORE_CONVERT, results)
						.then(function() {
							angular.forEach(results, function(response, i) {
								swaggerResourceName = data.openApiSpec.apis[i].path;
								swaggerResourceName = swaggerResourceName.substring(swaggerResourceName.lastIndexOf('/') + 1);
								convertInfos(response.openApiSpec, data.openApiSpec, swaggerResourceName);
								convertOperations(response.openApiSpec, data.openApiSpec, swaggerResourceName);
								convertModels(response.openApiSpec, data.openApiSpec);
							});
							deferred.resolve(true); // success
						})
						.catch(deferred.reject);
				})
				.catch(deferred.reject);
		}

		function convertSecurityDefinitions(openApiSpec) {
			var securityDefinitions = {};
			openApiSpec.securityDefinitions = securityDefinitions;
			angular.forEach(openApiSpec.authorizations, function(auth, key) {
				var def = securityDefinitions[key] = {
					type: auth.type === 'basicAuth' ? 'basic' : auth.type,
					in: auth.passAs,
					name: auth.keyname,
					scopes: []
				};
				if (auth.type === 'oauth2') {
					angular.forEach(auth.scopes, function(s) {
						def.scopes.push({
							name: s.scope,
							description: s.description
						});
					});
					var flow = Object.keys(auth.grantTypes)[0],
						grantType = auth.grantTypes[flow];

					if (flow === 'implicit') {
						def.flow = 'implicit';
						def.authorizationUrl = grantType.loginEndpoint.url;
					} else if (flow === 'authorization_code') {
						def.flow = 'accessCode';
						def.authorizationUrl = grantType.tokenRequestEndpoint.url;
						def.tokenUrl = grantType.tokenEndpoint.url;
					}
				}
			});
			delete openApiSpec.authorizations;
		}

		/**
		 * convert main infos and tags
		 */
		function convertInfos(swagger1, openApiSpec, swaggerResourceName) {
			openApiSpec.info.version = openApiSpec.info.version || swagger1.apiVersion;
			openApiSpec.basePath = openApiSpec.basePath || swagger1.basePath;
			if (openApiSpec.basePath.indexOf('http') === 0) {
				var a = angular.element('<a href="' + openApiSpec.basePath + '"></a>')[0];
				openApiSpec.schemes = [a.protocol.replace(':', '')];
				openApiSpec.host = a.host;
				openApiSpec.basePath = a.pathname;
			}
			openApiSpec.tags.push({
				name: swaggerResourceName
			});
		}

		function convertOperations(swagger1, openApiSpec, swaggerResourceName) {
			var path, responses;
			angular.forEach(swagger1.apis, function(subPath) {
				path = openApiSpec.paths[subPath.path] = openApiSpec.paths[subPath.path] || {};
				angular.forEach(subPath.operations, function(operation) {
					responses = {};
					path[operation.method.toLowerCase()] = {
						deprecated: angular.isString(operation.deprecated) ? operation.deprecated === 'true' : operation.deprecated,
						description: operation.notes,
						summary: operation.summary,
						operationId: operation.nickname,
						produces: operation.produces || swagger1.produces,
						consumes: operation.consumes || swagger1.consumes,
						parameters: operation.parameters,
						responses: responses,
						tags: [swaggerResourceName]
					};
					convertParameters(swagger1, operation);
					convertSecurity(swagger1, operation);
					convertResponses(swagger1, operation, responses);
					delete operation.authorizations;
				});
			});
		}

		function convertParameters(swagger1, operation) {
			angular.forEach(operation.parameters, function(param) {
				param.in = param.paramType === 'form' ? 'formData' : param.paramType;
				param.default = param.defaultValue;
				var ref = param.type || param.$ref;
				if (swagger1.models && ref && swagger1.models[ref]) {
					param.schema = {
						$ref: getModelReference(ref)
					};
					delete param.type;
				}
			});
		}

		function convertSecurity(swagger1, operation) {
			if (operation.authorizations) {
				operation.security = [];
				angular.forEach(operation.authorizations, function(scopes, name) {
					var sec = {};
					sec[name] = [];
					angular.forEach(scopes, function(s) {
						sec[name].push(s.scope);
					});
					operation.security.push(sec);
				});
			}
			delete operation.authorizations;
		}

		function convertResponses(swagger1, operation, responses) {
			var response;
			angular.forEach(operation.responseMessages, function(resp) {
				response = responses[resp.code] = {
					description: resp.message
				};
				if (resp.responseModel) {
					if (swagger1.models && swagger1.models[resp.responseModel]) {
						response.schema = {
							$ref: getModelReference(resp.responseModel)
						};
					} else {
						response.type = resp.responseModel;
					}
				} else if (resp.code === 200 && operation.type !== 'void') {
					response.schema = {
						type: operation.type,
						$ref: getModelReference(operation.type)
					};
					if (operation.type === 'array') {
						delete response.schema.$ref;
						var ref = operation.items.type || operation.items.$ref,
							items = response.schema.items = {};

						if (swagger1.models && swagger1.models[ref]) {
							items.$ref = getModelReference(ref);
						} else {
							items.type = ref;
						}
					}
				}
			});
		}

		function convertModels(swagger1, openApiSpec) {
			var subModel,
				mapRegExp = new RegExp('Map\\[string,(.*)\\]'),
				arrayRegExp = new RegExp('List\\[(.*)\\]'),
				polymorphicModels = [];

			angular.forEach(swagger1.models, function(model, name) {
				openApiSpec.definitions[name] = model;
				if (model.subTypes) {
					polymorphicModels.push(name);
				}
				angular.forEach(model.properties, function(prop) {
					var ref = prop.type || prop.$ref;
					if (ref && hasModelReference(ref, swagger1)) {
						prop.$ref = getModelReference(ref);
						delete prop.type;
					} else if (ref && ref.match(mapRegExp)) {
						// this a map/dictionary
						// natively not supported in Swagger 1.2, this fixes Java implementation
						delete prop.$ref;
						var subtype = ref.match(mapRegExp)[1];
						if (subtype && subtype.match(arrayRegExp)) {
							subtype = subtype.match(arrayRegExp)[1];
							prop.type = 'object';
							prop.additionalProperties = {
								type: 'array',
								items: generateProperty(subtype, swagger1)
							};
						} else {
							prop.type = 'object';
							prop.additionalProperties = generateProperty(subtype, swagger1);
						}
					} else if (prop.items) {
						ref = prop.items.type || prop.items.$ref;
						if (hasModelReference(ref, swagger1)) {
							prop.items.$ref = getModelReference(ref);
							delete prop.items.type;
						}
					} else if (prop.enum) {
						prop.type = 'string';
						delete prop.$ref;
					}
				});
			});
			// polymorphic models
			angular.forEach(polymorphicModels, function(name) {
				var model = openApiSpec.definitions[name];
				angular.forEach(model.subTypes, function(subType) {
					subModel = openApiSpec.definitions[subType];
					if (subModel) {
						openApiSpec.definitions[subType] = {
							allOf: [{
								$ref: getModelReference(name)
							}, subModel]
						};
					}
				});
				delete model.subTypes;
			});
		}

		function generateProperty(type, swagger1) {
			if (hasModelReference(type, swagger1)) {
				return {
					$ref: getModelReference(type)
				};
			} else {
				return {
					type: type
				};
			}
		}

		function hasModelReference(type, swagger1) {
			return swagger1.models && swagger1.models[type];
		}

		function getModelReference(type) {
			return '#/definitions/' + type;
		}

	})
	.run(function(swaggerModules, swagger1Converter) {
		swaggerModules.add(swaggerModules.BEFORE_PARSE, swagger1Converter, 10);
	});