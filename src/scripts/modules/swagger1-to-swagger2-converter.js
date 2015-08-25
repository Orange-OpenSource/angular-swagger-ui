/*
 * Orange angular-swagger-ui - v0.2.3
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swagger1ToSwagger2Converter', ['$q', '$http', 'swaggerModules', function($q, $http, swaggerModules) {

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
			var info = swaggerData.info;
			info.contact = {
				email: info.contact
			};
			info.license = {
				name: info.license,
				url: info.licenseUrl
			};
			info.termsOfService = info.termsOfServiceUrl;
			swaggerData.paths = {};
			swaggerData.definitions = {};
			swaggerData.tags = [];

			// load files
			var promises = [];
			angular.forEach(swaggerData.apis, function(api) {
				promises.push(get(swaggerUrl + api.path));
			});

			$q.all(promises)
				.then(function(results) {
					angular.forEach(results, function(result) {
						swaggerData.info.version = swaggerData.info.version || result.apiVersion;
						swaggerData.basePath = swaggerData.basePath || result.basePath;
						swaggerData.tags.push({
							name: result.resourcePath
						});
						angular.forEach(result.apis, function(subPath) {
							var path = swaggerData.paths[subPath.path] = swaggerData.paths[subPath.path] || {};
							angular.forEach(subPath.operations, function(op) {
								var responses = {};
								path[op.method.toLowerCase()] = {
									deprecated: op.deprecated,
									description: op.notes,
									summary: op.summary,
									operationId: op.nickname,
									produces: op.produces || result.produces,
									consumes: op.consumes || result.consumes,
									parameters: op.parameters,
									responses: responses,
									tags: [result.resourcePath]
								};
								// convert parameters
								angular.forEach(op.parameters, function(param) {
									param.in = param.paramType;
									if (result.models && result.models[param.type]) {
										param.schema = {
											$ref: '#/definitions/' + param.type
										};
										delete param.type;
									}
								});
								// convert responses
								angular.forEach(op.responseMessages, function(resp) {
									var response = responses[resp.code] = {
										description: resp.message
									};
									if (resp.responseModel) {
										if (result.models && result.models[resp.responseModel]) {
											response.schema = {
												$ref: '#/definitions/' + resp.responseModel
											};
										} else {
											response.type = resp.responseModel;
										}
									} else if (resp.code === 200 && op.type !== 'void') {
										response.schema = {
											type: op.type
										};
										if (op.type === 'array') {
											response.schema.items = {
												$ref: result.models && result.models[op.items.type] ? '#/definitions/' + op.items.type : op.items.type
											};
										}
									}
								});
							});
						});
						// convert models
						angular.forEach(result.models, function(model, name) {
							swaggerData.definitions[name] = model;
							if (model.subTypes) {
								angular.forEach(model.subTypes, function(subType) {
									var subModel = result.models && result.models[subType];
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
								if (result.models && result.models[prop.type]) {
									prop.$ref = '#/definitions/' + prop.type;
									delete prop.type;
								}
								if (prop.items && result.models && result.models[prop.items.type]) {
									prop.items.$ref = '#/definitions/' + prop.items.type;
									delete prop.items.type;
								}
							});
						});
					});
					swaggerData.swagger = '2.0';
					deferred.resolve(true);
				})
				.catch(deferred.reject);
		}

	}]);