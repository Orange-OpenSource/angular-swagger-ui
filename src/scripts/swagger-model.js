/*
 * angular-swagger-ui
 * http://github.com/maales/angular-swagger-ui
 * Version: 0.1.0 - 2015-02-26
 * License: MIT
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerModel', function() {

		/**
		 * sample object cache to avoid generating the same one multiple times
		 */
		var objCache = {};

		/**
		 * model cache to avoid generating the same one multiple times
		 */
		var modelCache = {};

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
		 * retrieves object class name based on definition
		 */
		function getClassName(schema) {
			return schema.$ref.replace('#/definitions/', '');
		}

		/**
		 * generates a sample object (request body or response body)
		 */
		function getSampleObj(swagger, schema) {
			var sample;
			if (schema.$ref) {
				// complex object
				var def = swagger.definitions && swagger.definitions[getClassName(schema)];
				if (def) {
					if (!objCache[schema.$ref]) {
						// object not in cache
						var obj = {};
						for (var name in def.properties) {
							obj[name] = getSampleObj(swagger, def.properties[name]);
						}
						// cache generated object
						objCache[schema.$ref] = obj;
					}
					sample = objCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				sample = [getSampleObj(swagger, schema.items)];
			} else {
				sample = getSampleValue(getType(schema), schema.defaultValue || schema.example);
			}
			return sample;
		}

		/**
		 * generates a sample value for a basic type
		 */
		function getSampleValue(type, defaultValue) {
			var result;
			if (typeof defaultValue !== 'undefined') {
				result = defaultValue;
			} else {
				switch (type) {
					case 'long':
					case 'integer':
						result = 0;
						break;
					case 'boolean':
						result = false;
						break;
					case 'double':
					case 'number':
						result = 0.0;
						break;
					case 'string':
						result = 'string';
						break;
					case 'date':
						result = (new Date()).toISOString().split('T')[0];
						break;
					case 'date-time':
						result = (new Date()).toISOString();
						break;
				}
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
		 * generates object's model
		 */
		var generateModel = this.generateModel = function(swagger, schema) {
			var model = '';

			function isRequired(item, name) {
				return item.required && item.required.indexOf(name) !== -1;
			}

			if (schema.$ref) {
				var className = getClassName(schema),
					def = swagger.definitions && swagger.definitions[className];

				if (def) {
					if (!modelCache[schema.$ref]) {
						// object not in cache
						var strModel = ['<div><strong>' + className + ' {</strong>'],
							buffer = [];

						for (var name in def.properties) {
							var prop = def.properties[name],
								propModel = ['<div class="pad"><strong>' + name + '</strong> (<span class="type">'];

							// build type
							if (prop.$ref) {
								propModel.push(getClassName(prop));
								buffer.push(generateModel(swagger, prop));
							} else if (prop.type === 'array') {
								propModel.push('Array[');
								if (prop.items.$ref) {
									propModel.push(getClassName(prop.items));
									buffer.push(generateModel(swagger, prop.items));
								} else {
									propModel.push(getType(prop.items));
								}
								propModel.push(']');
							} else {
								propModel.push(getType(prop));
							}
							propModel.push('</span>');
							// is required ?
							if (!isRequired(def, name)) {
								propModel.push(', ', '<em>optional</em>');
							}
							propModel.push(')');
							// has description
							if (prop.description) {
								propModel.push(': ', prop.description);
							}
							// is enum
							if (prop.enum) {
								propModel.push(' = ', angular.toJson(prop.enum).replace(/,/g, ' or '));
							}
							propModel.push(',</div>');
							strModel.push(propModel.join(''));
						}
						strModel.push('<strong>}</strong>');
						strModel.push(buffer.join(''), '</div>');
						// cache generated object
						modelCache[schema.$ref] = strModel.join('');
					}
					model = modelCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				model = '<strong>array {\n\n}</strong>';
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
