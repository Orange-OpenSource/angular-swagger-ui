/*
 * Orange angular-swagger-ui - v0.4.4
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swagger1ToSwagger2Converter', function($q, $http, swaggerModules) {

		/**
		 * Module entry point
		 */
		this.execute = function(swaggerUrl, swaggerData) {
			var deferred = $q.defer(),
				version = swaggerData.swaggerVersion;

			if (version && version.indexOf('1.') === 0) {
				convert(deferred, swaggerUrl, swaggerData);
			} else {
				deferred.resolve(false);
			}
			return deferred.promise;
		};

		/**
		 * Load Swagger file
		 */
		function get(url) {
			var deferred = $q.defer();
			var options = {
				method: 'GET',
				url: url
			};
			swaggerModules
				.execute(swaggerModules.BEFORE_LOAD, options)
				.then(function() {
					$http(options)
						.then(deferred.resolve)
						.catch(deferred.reject);
				})
				.catch(deferred.reject);

			return deferred.promise;
		}

		/**
		 * Transforms Swagger 1 to Swagger 2
		 */
		function convert(deferred, swaggerUrl, swaggerData) {
			// prepare swagger2 objects
			var swagger2 = swaggerData,
				info = swagger2.info || (swagger2.info = {}),
				promises = [];

			info.contact = {
				email: info.contact
			};
			info.license = {
				name: info.license,
				url: info.licenseUrl
			};
			info.termsOfService = info.termsOfServiceUrl;
			swagger2.paths = {};
			swagger2.definitions = {};
			swagger2.tags = [];

			// load files
			angular.forEach(swagger2.apis, function(api) {
				promises.push(get(swaggerUrl + api.path));
			});

			$q.all(promises)
				.then(function(results) {
					swaggerModules
						.execute(swaggerModules.BEFORE_CONVERT, results)
						.then(function() {
							angular.forEach(results, function(response) {
								convertInfos(response.data, swagger2);
								convertOperations(response.data, swagger2);
								convertModels(response.data, swagger2);
							});
							swagger2.swagger = '2.0';
							deferred.resolve(true); // success
						})
						.catch(deferred.reject);
				})
				.catch(deferred.reject);
		}

		/**
		 * convert main infos and tags
		 */
		function convertInfos(swagger1, swagger2) {
			swagger2.info.version = swagger2.info.version || swagger1.apiVersion;
			swagger2.basePath = swagger2.basePath || swagger1.basePath;
			if (swagger2.basePath.indexOf('http') === 0) {
				var a = angular.element('<a href="' + swagger2.basePath + '"></a>')[0];
				swagger2.schemes = [a.protocol.replace(':', '')];
				swagger2.host = a.host;
				swagger2.basePath = a.pathname;
			}
			swagger2.tags.push({
				name: swagger1.resourcePath.substring(swagger1.resourcePath.lastIndexOf('/') + 1)
			});
		}

		function convertOperations(swagger1, swagger2) {
			var path, responses;
			angular.forEach(swagger1.apis, function(subPath) {
				path = swagger2.paths[subPath.path] = swagger2.paths[subPath.path] || {};
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
						tags: [swagger1.resourcePath.substring(swagger1.resourcePath.lastIndexOf('/') + 1)]
					};
					convertParameters(swagger1, operation);
					convertResponses(swagger1, operation, responses);
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

		function convertModels(swagger1, swagger2) {
			var subModel,
				mapRegExp = new RegExp('Map\\[string,(.*)\\]'),
				arrayRegExp = new RegExp('List\\[(.*)\\]');

			angular.forEach(swagger1.models, function(model, name) {
				swagger2.definitions[name] = model;
				if (model.subTypes) {
					angular.forEach(model.subTypes, function(subType) {
						subModel = swagger1.models && swagger1.models[subType];
						if (subModel) {
							model.required = (model.required || []).concat(subModel.required || []);
							angular.forEach(subModel.properties, function(property, name) {
								model.properties[name] = property;
							});
						}
					});
					delete model.subTypes;
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
								type: 'array'
							};
							prop.additionalProperties.items = generateProperty(subtype, swagger1);
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
	.run(function(swaggerModules, swagger1ToSwagger2Converter) {
		swaggerModules.add(swaggerModules.BEFORE_PARSE, swagger1ToSwagger2Converter);
	});