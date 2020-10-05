/*
 * Orange angular-swagger-ui - v0.6.5
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
		var resolveReference = this.resolveReference = function(openApiSpec, object) {
			var result = object;
			if (object.$ref) {
				var parts = object.$ref.replace('#/', '').split('/');
				result = openApiSpec;
				for (var i = 0, j = parts.length; i < j; i++) {
					result = result[parts[i]];
				}
				if (!result) {
					console.error('could not resolve model definition', object.$ref);
				}
			}
			result = resolveAllOf(openApiSpec, result);
			return angular.copy(result);
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
		function resolveAllOf(openApiSpec, schema) {
			if (schema.allOf) {
				schema = angular.copy(schema);
				angular.forEach(schema.allOf, function(def) {
					var ref = resolveReference(openApiSpec, def);
					if (!def.$ref || !ref.discriminator) {
						// do not handle inherited properties here
						angular.merge(schema, ref);
					}
				});
				delete schema.allOf;
			}
			return schema;
		}

		/**
		 * generates a sample object (request body or response body)
		 */
		function getSampleObj(openApiSpec, schema, currentGenerated) {
			var sample, def, name, prop;
			currentGenerated = currentGenerated || {}; // used to handle circular references
			schema = resolveAllOf(openApiSpec, schema);
			if (schema.parentModelsRef) {
				angular.forEach(schema.parentModelsRef, function(ref) {
					var def = resolveReference(openApiSpec, ref);
					angular.merge(schema, def);
				});
			}
			if (schema.default || schema.example) {
				sample = schema.default || schema.example;
			} else if (schema.properties) {
				sample = {};
				for (name in schema.properties) {
					prop = schema.properties[name];
					sample[name] = getSampleObj(openApiSpec, prop.schema || prop, currentGenerated);
				}
			} else if (schema.additionalProperties) {
				// this is a map/dictionary
				// @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#model-with-mapdictionary-properties
				def = resolveReference(openApiSpec, schema.additionalProperties);
				sample = {
					'string': getSampleObj(openApiSpec, def, currentGenerated)
				};
			} else if (schema.$ref) {
				// complex object
				def = resolveReference(openApiSpec, schema);
				if (def) {
					if (!sampleCache[schema.$ref] && !currentGenerated[schema.$ref]) {
						// object not in cache
						currentGenerated[schema.$ref] = true;
						sampleCache[schema.$ref] = getSampleObj(openApiSpec, def, currentGenerated);
					}
					sample = sampleCache[schema.$ref] || {};
				} else {
					console.warn('AngularSwaggerUI: schema not found', schema.$ref);
					sample = schema.$ref;
				}
			} else if (schema.type === 'array') {
				sample = [getSampleObj(openApiSpec, schema.items, currentGenerated)];
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
		this.generateSampleJson = function(openApiSpec, schema, example) {
			var obj, json;
			try {
				obj = example || getSampleObj(openApiSpec, schema);
				if (obj) {
					json = angular.toJson(obj, true);
				}
			} catch (ex) {
				console.error('AngularSwaggerUI: failed to generate sample json', schema, ex);
				json = 'failed to generate sample json';
			}
			return json;
		};

		/**
		 * generates a sample XML string (request body or response body)
		 */
		this.generateSampleXml = function(openApiSpec, schema, example) {
			//TODO
			return '<?xml version="1.0" encoding="UTF-8"?>\n<!-- XML example cannot be generated -->';
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
			return INLINE_MODEL_NAME + (countInLineModels++);
		}

		/**
		 * identify models using inheritance
		 */
		this.resolveInheritance = function(openApiSpec) {
			angular.forEach(openApiSpec.definitions, function(schema, modelName) {
				resolveItemInheritance(openApiSpec, schema, schema, modelName);
			});
		};

		function resolveItemInheritance(openApiSpec, schema, def, modelName) {
			if (def.discriminator && !schema.subModelsRef) {
				schema.subModelsRef = [];
				angular.forEach(openApiSpec.definitions, function(subSchema, subModelName) {
					if (modelName !== subModelName && subSchema.allOf) {
						angular.forEach(subSchema.allOf, function(parent) {
							if (parent.$ref && modelName === getClassName(parent)) {
								subSchema.parentModelsRef = subSchema.parentModelsRef || [];
								subSchema.parentModelsRef.push({
									'$ref': '#/definitions/' + modelName
								});
								schema.subModelsRef.push({
									'$ref': '#/definitions/' + subModelName
								});
							}
							resolveItemInheritance(openApiSpec, subSchema, parent, subModelName);
						});
					}
				});
			}
		}

		/**
		 * generate a model and its submodels from schema
		 */
		this.generateModel = function(openApiSpec, schema, operationId, showInheritedProperties) {
			var model = [],
				subModelIds = {},
				subModels = {},
				def;

			try {
				schema = resolveAllOf(openApiSpec, schema);
				// find models to generate
				if (schema.properties) {
					// if inline model
					subModels[getInlineModelName()] = schema;
					angular.merge(subModels, findAllModels(openApiSpec, schema, subModelIds));
				} else {
					subModels = findAllModels(openApiSpec, schema, subModelIds);
				}
				def = resolveReference(openApiSpec, schema);
				if (!def.properties) {
					// if not complex type
					model.push('<strong>', getModelProperty(def, subModels, subModelIds, operationId), '</strong><br><br>');
				}
				angular.forEach(subModels, function(subSchema, subModelName) {
					model.push(getModel(openApiSpec, subSchema, subModelName, subModels, subModelIds, operationId, showInheritedProperties));
				});
			} catch (ex) {
				console.error('AngularSwaggerUI: failed to generate model', schema, ex);
				model = ['failed to generate model'];
			}
			clearModelCache();
			return model.join('');
		};

		/**
		 * find all models to generate
		 */
		function findAllModels(openApiSpec, schema, subModelIds, modelName, onGoing) {
			var models = {};
			if (modelName) {
				onGoing = onGoing || {}; // used to handle circular definitions
				if (onGoing[modelName]) {
					return models;
				}
				onGoing[modelName] = true;
			}
			schema = resolveAllOf(openApiSpec, schema);
			if (schema.properties) {
				angular.forEach(schema.properties, function(property) {
					inspectSubModel(openApiSpec, property, models, subModelIds, onGoing);
				});
			} else if (schema.schema || schema.$ref) {
				var subSchema = schema.schema || schema,
					def = resolveReference(openApiSpec, subSchema),
					subPropertyModelName = getClassName(subSchema);

				if (def && (!def.type || def.type === 'object' || def.type === 'array')) {
					def = resolveAllOf(openApiSpec, def);
					models[subPropertyModelName] = def;
					subModelIds[subPropertyModelName] = countModel++;
					angular.merge(models, findAllModels(openApiSpec, def, subModelIds, subPropertyModelName, onGoing));
				}
			} else if (schema.type === 'array') {
				inspectSubModel(openApiSpec, schema.items, models, subModelIds, onGoing);
			} else if (schema.additionalProperties) {
				// this is a map/dictionary
				inspectSubModel(openApiSpec, schema.additionalProperties, models, subModelIds, onGoing);
			}
			if (schema.subModelsRef) {
				// find missing subclasses
				var missingModelsRef = [],
					keys = Object.keys(subModelIds),
					i = 0;

				for (; i < schema.subModelsRef.length; i++) {
					if (keys.indexOf(getClassName(schema.subModelsRef[i])) === -1) {
						missingModelsRef.push(schema.subModelsRef[i]);
					}
				}
				if (missingModelsRef.length > 0) {
					// add sub classes
					addInheritanceModels(openApiSpec, missingModelsRef, models, subModelIds, onGoing);
				}
			}
			if (schema.parentModelsRef) {
				// find super classes
				addInheritanceModels(openApiSpec, schema.parentModelsRef, models, subModelIds, onGoing);
			}
			return models;
		}

		function addInheritanceModels(openApiSpec, inheritanceModels, models, subModelIds, onGoing) {
			angular.forEach(inheritanceModels, function(ref) {
				var def = resolveReference(openApiSpec, ref),
					subModelName = getClassName(ref);

				models[subModelName] = def;
				subModelIds[subModelName] = countModel++;
				angular.merge(models, findAllModels(openApiSpec, def, subModelIds, subModelName, onGoing));
			});
		}

		/**
		 * look for submodels
		 */
		function inspectSubModel(openApiSpec, schema, models, subModelIds, onGoing) {
			var inlineModelName = generateInlineModel(schema, models, subModelIds);
			angular.merge(models, findAllModels(openApiSpec, schema, subModelIds, inlineModelName, onGoing));
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
		 * generates an HTML link to a submodel
		 */
		function getSubModelLink(operationId, name) {
			var linkModelId = operationId + '-model-' + name;
			return ['<a class="model-link type" onclick="swaggerlink(\'', linkModelId, '\')">', name, '</a>'].join('');
		}

		/**
		 * model counter
		 */
		var countModel = 0;

		/**
		 * generates a single model in HTML
		 */
		function getModel(openApiSpec, schema, modelName, subModels, subModelIds, operationId, showInheritedProperties) {
			var buffer = ['<div class="model" id="', operationId + '-model-' + modelName, '">'];
			schema = resolveAllOf(openApiSpec, schema);
			if (schema.properties) {
				buffer.push('<div><strong>', modelName);
				if (schema.parentModelsRef) {
					buffer.push('</strong> extends <strong>');
					angular.forEach(schema.parentModelsRef, function(ref) {
						buffer.push(getSubModelLink(operationId, getClassName(ref)), ' ');
						if (!showInheritedProperties) {
							// remove inherited properties
							var parentSchema = resolveReference(openApiSpec, ref);
							angular.forEach(parentSchema.properties, function (property, name) {
								if (schema.properties[name]) {
									delete schema.properties[name];
								}
							});
						}
					});
					buffer.pop();
				}
				buffer.push(' {</strong></div>');
				var hasProperties = false;
				angular.forEach(schema.properties, function(property, propertyName) {
					hasProperties = true;
					if (!property.type && property.$ref) {
						var ref = resolveReference(openApiSpec, property);
						if (ref.type !== 'object' && ref.type !== 'array') {
							// this is a simple type
							property = ref;
						}
					}
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
					var enumValues = property.enum || (property.items && property.items.enum);
					if (enumValues) {
						buffer.push(', Enum = ', angular.toJson(enumValues).replace(/,/g, ', '));
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
				buffer.push(getSubModelLink(operationId, property.modelName));
			} else if (property.schema || property.$ref) {
				modelName = getClassName(property.schema || property);
				buffer.push(getSubModelLink(operationId, modelName));
			} else if (property.type === 'array') {
				buffer.push('Array[');
				buffer.push(getModelProperty(property.items, subModels, subModelIds, operationId));
				buffer.push(']');
			} else if (property.properties) {
				buffer.push(getSubModelLink(operationId, modelName));
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
		function clearModelCache() {
			countModel = 0;
			countInLineModels = 1;
		}

		this.clearCache = function() {
			sampleCache = {};
		};

	});