/*
 * Orange angular-swagger-ui - v0.3.2
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
						.success(deferred.resolve)
						.error(deferred.reject);
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
				info = swagger2.info,
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
					angular.forEach(results, function(swagger1) {
						convertInfos(swagger1, swagger2);
						convertOperations(swagger1, swagger2);
						convertModels(swagger1, swagger2);
					});
					swagger2.swagger = '2.0';
					deferred.resolve(true); // success
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
				name: swagger1.resourcePath
			});
		}

		function convertOperations(swagger1, swagger2) {
			var path, responses;
			angular.forEach(swagger1.apis, function(subPath) {
				path = swagger2.paths[subPath.path] = swagger2.paths[subPath.path] || {};
				angular.forEach(subPath.operations, function(operation) {
					responses = {};
					path[operation.method.toLowerCase()] = {
						deprecated: operation.deprecated,
						description: operation.notes,
						summary: operation.summary,
						operationId: operation.nickname,
						produces: operation.produces || swagger1.produces,
						consumes: operation.consumes || swagger1.consumes,
						parameters: operation.parameters,
						responses: responses,
						tags: [swagger1.resourcePath]
					};
					convertParameters(swagger1, operation);
					convertResponses(swagger1, operation, responses);
				});
			});
		}

		function convertParameters(swagger1, operation) {
			angular.forEach(operation.parameters, function(param) {
				param.in = param.paramType;
				var ref = param.type || param.$ref;
				if (swagger1.models && ref && swagger1.models[ref]) {
					param.schema = {
						$ref: '#/definitions/' + ref
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
							$ref: '#/definitions/' + resp.responseModel
						};
					} else {
						response.type = resp.responseModel;
					}
				} else if (resp.code === 200 && operation.type !== 'void') {
					response.schema = {
						type: operation.type
					};
					if (operation.type === 'array') {
						var ref = operation.items.type || operation.items.$ref,
							items = response.schema.items = {};
							
						if (swagger1.models && swagger1.models[ref]) {
							items.$ref = '#/definitions/' + ref;
						} else {
							items.type = ref;
						}
					}
				}
			});
		}

		function convertModels(swagger1, swagger2) {
			var subModel;
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
					if (swagger1.models && ref && swagger1.models[ref]) {
						prop.$ref = '#/definitions/' + ref;
						delete prop.type;
					}
					if (prop.items) {
						ref = prop.items.type || prop.items.$ref;
						if (swagger1.models && ref && swagger1.models[ref]) {
							prop.items.$ref = '#/definitions/' + ref;
						}
						delete prop.items.type;
					}
				});
			});
		}

	})
	.run(function(swaggerModules, swagger1ToSwagger2Converter) {
		swaggerModules.add(swaggerModules.BEFORE_PARSE, swagger1ToSwagger2Converter);
	});