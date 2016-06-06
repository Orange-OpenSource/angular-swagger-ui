/*
 * Orange angular-swagger-ui - v0.3.2
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerModel', function(swaggerTranslator) {

		/**
		 * sample object cache to avoid generating the same one multiple times
		 */
		var objCache = {};

		/**
		 * model cache to avoid generating the same one multiple times
		 */
		var modelCache = {};

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
		 * retrieves object class name based on $ref
		 */
		function getClassName(item) {
			var parts = item.$ref.split('/');
			return parts[parts.length - 1];
		}

		/**
		 * handles allOf property of a schema
		 */
		function resolveAllOf(swagger, schema) {
			if (schema.allOf) {
				var newSchema = {};
				angular.forEach(schema.allOf, function(def) {
					angular.merge(newSchema, resolveReference(swagger, def));
				});
				schema = newSchema;
			}
			return schema;
		}

		/**
		 * generates a sample object (request body or response body)
		 */
		function getSampleObj(swagger, schema, currentGenerated) {
			var sample;
			currentGenerated = currentGenerated || {}; // used to handle circular references
			schema = resolveAllOf(swagger, schema);
			if (schema.default || schema.example) {
				sample = schema.default || schema.example;
			} else if (schema.properties) {
				sample = {};
				for (var name in schema.properties) {
					var prop = schema.properties[name];
					sample[name] = getSampleObj(swagger, prop.schema || prop, currentGenerated);
				}
			} else if (schema.$ref) {
				// complex object
				var def = resolveReference(swagger, schema);
				if (def) {
					if (!objCache[schema.$ref] && !currentGenerated[schema.$ref]) {
						// object not in cache
						currentGenerated[schema.$ref] = true;
						objCache[schema.$ref] = getSampleObj(swagger, def, currentGenerated);
					}
					sample = objCache[schema.$ref] || {};
				} else {
					console.warn('schema not found', schema.$ref);
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
			var json,
				obj = getSampleObj(swagger, schema);

			if (obj) {
				json = angular.toJson(obj, true);
			}
			return json;
		};

		/**
		 * inline model counter
		 */
		var countInLine = 0;

		/**
		 * generates object's model
		 */
		var generateModel = this.generateModel = function(swagger, schema, modelName, currentGenerated) {
			var model = '',
				buffer,
				submodels,
				propertyName,
				property,
				hasProperties = false,
				name,
				className,
				def,
				sub;

			currentGenerated = currentGenerated || {}; // used to handle circular references

			function isRequired(item, name) {
				return item.required && item.required.indexOf(name) !== -1;
			}

			function getInlineModelName() {
				var n = 'Inline Model';
				if (countInLine > 0) {
					n += countInLine;
				}
				countInLine++;
				return n;
			}

			schema = resolveAllOf(swagger, schema);
			if (schema.properties) {
				modelName = modelName || getInlineModelName();
				currentGenerated[modelName] = true;
				buffer = ['<div><strong>' + modelName + ' {</strong>'];
				submodels = [];
				for (propertyName in schema.properties) {
					hasProperties = true;
					property = schema.properties[propertyName];
					buffer.push('<div class="pad"><strong>', propertyName, '</strong> (<span class="type">');
					// build type
					if (property.properties) {
						name = getInlineModelName();
						buffer.push(name);
						submodels.push(generateModel(swagger, property, name, currentGenerated));
					} else if (property.schema || property.$ref) {
						buffer.push(getClassName(property.schema || property));
						submodels.push(generateModel(swagger, property.schema || property, null, currentGenerated));
					} else if (property.type === 'array') {
						buffer.push('Array[');
						if (property.items.properties) {
							name = getInlineModelName();
							buffer.push(name);
							submodels.push(generateModel(swagger, property, name, currentGenerated));
						} else if (property.items.$ref) {
							buffer.push(getClassName(property.items));
							submodels.push(generateModel(swagger, property.items, null, currentGenerated));
						} else {
							buffer.push(getType(property.items));
						}
						buffer.push(']');
					} else {
						buffer.push(getType(property));
					}
					buffer.push('</span>');
					// is required ?
					if (!isRequired(schema, propertyName)) {
						buffer.push(', ', '<em>' + swaggerTranslator.translate('modelOptional') + '</em>');
					}
					buffer.push(')');
					// has description
					if (property.description) {
						buffer.push(': ', property.description);
					}
					// is enum
					if (property.enum) {
						buffer.push(' = ', angular.toJson(property.enum).replace(/,/g, swaggerTranslator.translate('modelOr')));
					}
					buffer.push(',</div>');
				}
				if (hasProperties) {
					buffer.pop();
					buffer.push('</div>');
				}
				buffer.push('<div><strong>}</strong></div>');
				buffer.push(submodels.join(''), '</div>');
				model = buffer.join('');
			} else if (schema.$ref) {
				className = getClassName(schema);
				def = resolveReference(swagger, schema);
				if (currentGenerated[className]) {
					return ''; // already generated
				}
				if (def) {
					if (!modelCache[schema.$ref]) {
						// cache generated object
						modelCache[schema.$ref] = generateModel(swagger, def, className, currentGenerated);
					}
					currentGenerated[className] = true;
					model = modelCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				buffer = ['<strong>Array ['];
				sub = '';
				if (schema.items.properties) {
					name = getInlineModelName();
					buffer.push(name);
					sub = generateModel(swagger, schema.items, name, currentGenerated);
				} else if (schema.items.$ref) {
					buffer.push(getClassName(schema.items));
					sub = generateModel(swagger, schema.items, null, currentGenerated);
				} else {
					buffer.push(getType(schema.items));
				}
				buffer.push(']</strong><br><br>', sub);
				model = buffer.join('');
			} else if (schema.type === 'object') {
				name = modelName || getInlineModelName();
				model = '<strong>' + name + ' {<br>}</strong>';
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

	});