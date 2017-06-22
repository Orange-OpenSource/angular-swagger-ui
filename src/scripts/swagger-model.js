/*
 * Orange angular-swagger-ui - v0.4.4
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerModel', function(swaggerTranslator) {

		var INLINE_MODEL_NAME = 'InlineModel';

		/**
		 * sample object cache to avoid generating the same one multiple times
		 */
		var sampleCache = {};

		/**
		 * retrieves object definition
		 */
		var resolveReference = this.resolveReference = function(swagger, object) {
			if (object.$ref) {
				var parts = object.$ref.replace('#/', '').split('/');
				object = swagger;
				for (var i = 0, j = parts.length; i < j; i++) {
					object = object[parts[i]];
				}
			}
			return object;
		};

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
		 * handles allOf property of a schema
		 */
		function resolveAllOf(swagger, schema) {
			if (schema.allOf) {
				angular.forEach(schema.allOf, function(def) {
					angular.merge(schema, resolveReference(swagger, def));
				});
				delete schema.allOf;
			}
			return schema;
		}

		/**
		 * generates a sample object (request body or response body)
		 */
		function getSampleObj(swagger, schema, currentGenerated) {
			var sample, def, name, prop;
			currentGenerated = currentGenerated || {}; // used to handle circular references
			schema = resolveAllOf(swagger, schema);
			if (schema.default || schema.example) {
				sample = schema.default || schema.example;
			} else if (schema.properties) {
				sample = {};
				for (name in schema.properties) {
					prop = schema.properties[name];
					sample[name] = getSampleObj(swagger, prop.schema || prop, currentGenerated);
				}
			} else if (schema.additionalProperties) {
				// this is a map/dictionary
				// @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#model-with-mapdictionary-properties
				def = resolveReference(swagger, schema.additionalProperties);
				sample = {
					'string': getSampleObj(swagger, def, currentGenerated)
				};
			} else if (schema.$ref) {
				// complex object
				def = resolveReference(swagger, schema);
				if (def) {
					if (!sampleCache[schema.$ref] && !currentGenerated[schema.$ref]) {
						// object not in cache
						currentGenerated[schema.$ref] = true;
						sampleCache[schema.$ref] = getSampleObj(swagger, def, currentGenerated);
					}
					sample = sampleCache[schema.$ref] || {};
				} else {
					console.warn('schema not found', schema.$ref);
					sample = schema.$ref;
				}
			} else if (schema.type === 'array') {
				sample = [getSampleObj(swagger, schema.items, currentGenerated)];
			} else if (schema.type === 'object') {
				sample = {};
			} else {
				sample = schema.defaultValue || schema.example || getSampleValue(schema);
			}
			return sample;
		}

		/**
		 * generates a sample value for a basic type
		 */
		function getSampleValue(schema) {
			var result,
				type = getType(schema);

			switch (type) {
				case 'long':
				case 'integer':
					result = 0;
					break;
				case 'boolean':
					result = false;
					break;
				case 'float':
				case 'double':
				case 'number':
					result = 0.0;
					break;
				case 'string':
				case 'byte':
				case 'binary':
				case 'password':
					result = 'string';
					if (schema.enum && schema.enum.length > 0) {
						result = schema.enum[0];
					}
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
			try {
				var json,
					obj = getSampleObj(swagger, schema);

				if (obj) {
					json = angular.toJson(obj, true);
				}
				return json;

			} catch (ex) {
				console.error('failed to generate sample json', schema, ex);
				return 'failed to generate sample json';
			}
		};

		/**
		 * retrieves object class name based on $ref
		 */
		function getClassName(schema) {
			var parts = schema.$ref.split('/');
			return parts[parts.length - 1];
		}

		/**
		 * inline model counter
		 */
		var countInLineModels = 1;

		/**
		 * is model attribute required ?
		 */
		function isRequired(item, name) {
			return item.required && item.required.indexOf(name) !== -1;
		}

		/**
		 * generates new inline model name
		 */
		function getInlineModelName() {
			var name = INLINE_MODEL_NAME + (countInLineModels++);
			return name;
		}

		/**
		 * model object caches to avoid generating the same one multiple times
		 */
		var modelCache = {};
		var modelCacheIds = {};

		/**
		 * generate a model and its submodels from schema
		 */
		this.generateModel = function(swagger, schema, operationId) {
			try {
				schema = resolveAllOf(swagger, schema);
				var model = [],
					subModelIds = {},
					subModels = {};

				if (schema.properties) {
					// if inline model
					subModels[getInlineModelName()] = schema;
					subModels = angular.merge(subModels, findAllModels(swagger, schema, subModelIds));
				} else {
					subModels = findAllModels(swagger, schema, subModelIds);
				}

				if (!schema.$ref && !schema.properties) {
					// if array or map/dictionary or simple type
					model.push('<strong>', getModelProperty(schema, subModels, subModelIds, operationId), '</strong><br><br>');
				}
				angular.forEach(subModels, function(schema, modelName) {
					model.push(getModelMaybeFromCache(swagger, schema, modelName, subModels, subModelIds, operationId));
				});
				return model.join('');

			} catch (ex) {
				console.error('failed to generate model', schema, ex);
				return 'failed to generate model';
			}
		};

		/**
		 * find all models to generate
		 */
		function findAllModels(swagger, schema, subModelIds, modelName, onGoing) {
			var models = {};
			if (modelName) {
				onGoing = onGoing || {}; // used to handle circular definitions
				if (onGoing[modelName]) {
					return models;
				}
				onGoing[modelName] = true;
			}
			schema = resolveAllOf(swagger, schema);
			if (schema.properties) {
				angular.forEach(schema.properties, function(property) {
					inspectSubModel(swagger, property, models, subModelIds, onGoing);
				});
			} else if (schema.schema || schema.$ref) {
				var subSchema = schema.schema || schema,
					def = resolveReference(swagger, subSchema),
					subPropertyModelName = getClassName(subSchema);

				if (def) {
					models[subPropertyModelName] = def;
					subModelIds[subPropertyModelName] = countModel++;
					angular.merge(models, findAllModels(swagger, def, subModelIds, subPropertyModelName, onGoing));
				}
			} else if (schema.type === 'array') {
				inspectSubModel(swagger, schema.items, models, subModelIds, onGoing);
			} else if (schema.additionalProperties) {
				// this is a map/dictionary
				inspectSubModel(swagger, schema.additionalProperties, models, subModelIds, onGoing);
			}
			return models;
		}

		/**
		 * look for submodels
		 */
		function inspectSubModel(swagger, schema, models, subModelIds, onGoing) {
			var inlineModelName = generateInlineModel(schema, models, subModelIds);
			angular.merge(models, findAllModels(swagger, schema, subModelIds, inlineModelName, onGoing));
		}

		/**
		 * generates an inline model if needed
		 */
		function generateInlineModel(subProperty, models, subModelIds) {
			var subModelName;
			if (subProperty.properties) {
				subModelName = getInlineModelName();
				subProperty.modelName = subModelName;
				subModelIds[subModelName] = countModel++;
				models[subModelName] = subProperty;
			}
			return subModelName;
		}

		/**
		 * get model from cache or generate it
		 */
		function getModelMaybeFromCache(swagger, schema, modelName, subModels, subModelIds, operationId) {
			var model,
				useCache = false;

			if (modelName.indexOf(INLINE_MODEL_NAME) === -1) {
				// inline models are not cached
				useCache = true;
			}
			if (useCache) {
				if (modelCache[modelName]) {
					model = modelCache[modelName];
					// substitute moel IDs
					angular.forEach(modelCacheIds, function(id, subName) {
						model = model.replace(id, operationId + '-model-' + subModelIds[subName]);
					});
				} else {
					model = modelCache[modelName] = getModel(swagger, schema, modelName, subModels, subModelIds, operationId);
					modelCacheIds[modelName] = operationId + '-model-' + subModelIds[modelName];
				}
			} else {
				model = getModel(swagger, schema, modelName, subModels, subModelIds, operationId);
			}
			return model;
		}

		/**
		 * generates an HTML link to a submodel
		 */
		function getSubModelLink(operationId, modelId, name) {
			return ['<a class="model-link type" onclick="swaggerlink(\'', operationId, '-model-', modelId, '\')">', name, '</a>'].join('');
		}

		/**
		 * model counter
		 */
		var countModel = 0;

		/**
		 * generates a single model in HTML
		 */
		function getModel(swagger, schema, modelName, subModels, subModelIds, operationId) {
			var buffer = ['<div class="model" id="', operationId + '-model-' + subModelIds[modelName], '">'];
			if (schema.properties) {
				buffer.push('<div><strong>' + modelName + ' {</strong></div>');
				var hasProperties = false;
				angular.forEach(schema.properties, function(property, propertyName) {
					hasProperties = true;
					buffer.push('<div class="pad"><strong>', propertyName, '</strong> (<span class="type">');
					buffer.push(getModelProperty(property, subModels, subModelIds, operationId));
					buffer.push('</span>');
					if (!isRequired(schema, propertyName)) {
						buffer.push(', ', '<em>' + swaggerTranslator.translate('modelOptional') + '</em>');
					}
					buffer.push(')');
					if (property.description) {
						buffer.push(': ', property.description);
					}
					if (property.enum) {
						buffer.push(' = ', angular.toJson(property.enum).replace(/,/g, swaggerTranslator.translate('modelOr')));
					}
					buffer.push(',</div>');
				});
				if (hasProperties) {
					buffer.pop();
					buffer.push('</div>');
				}
				buffer.push('<div><strong>}</strong></div>');
			} else if (schema.type === 'array' || schema.additionalProperties) {
				buffer.push(getModelProperty(schema, subModels, subModelIds, operationId));
			} else if (schema.type === 'object') {
				buffer.push('<strong>', modelName || getInlineModelName(), ' {<br>}</strong>');
			} else if (schema.type) {
				buffer.push('<strong>', getType(schema), '</strong>');
			}
			return buffer.join('');
		}

		/**
		 * retrieves model property class
		 */
		function getModelProperty(property, subModels, subModelIds, operationId) {
			var modelName, buffer = [];
			if (property.modelName) {
				buffer.push(getSubModelLink(operationId, subModelIds[property.modelName], property.modelName));
			} else if (property.schema || property.$ref) {
				modelName = getClassName(property.schema || property);
				buffer.push(getSubModelLink(operationId, subModelIds[modelName], modelName));
			} else if (property.type === 'array') {
				buffer.push('Array[');
				buffer.push(getModelProperty(property.items, subModels, subModelIds, operationId));
				buffer.push(']');
			} else if (property.properties) {
				buffer.push(getSubModelLink(operationId, subModelIds[property.modelName], modelName));
			} else if (property.additionalProperties) {
				// this is a map/dictionary
				buffer.push('Map&lt;string, ');
				buffer.push(getModelProperty(property.additionalProperties, subModels, subModelIds, operationId));
				buffer.push('&gt;');
			} else {
				buffer.push(getType(property));
			}
			return buffer.join('');
		}

		/**
		 * clears generated samples cache
		 */
		this.clearCache = function() {
			sampleCache = {};
			modelCache = {};
			modelCacheIds = {};
			countModel = 0;
			countInLineModels = 1;
		};

	});