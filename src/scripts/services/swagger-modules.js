/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerModules', function($q) {

		var modules = {};

		this.AUTH = 'AUTH';
		this.BEFORE_LOAD = 'BEFORE_LOAD';
		this.AFTER_LOAD = 'AFTER_LOAD';
		this.BEFORE_PARSE = 'BEFORE_PARSE';
		this.PARSE = 'PARSE';
		this.BEFORE_DISPLAY = 'BEFORE_DISPLAY';
		this.BEFORE_EXPLORER_LOAD = 'BEFORE_EXPLORER_LOAD';
		this.AFTER_EXPLORER_LOAD = 'AFTER_EXPLORER_LOAD';
		this.BEFORE_CONVERT = 'BEFORE_CONVERT';

		/**
		 * Adds a new module to swagger-ui
		 */
		this.add = function(phase, module, priority) {
			if (!modules[phase]) {
				modules[phase] = [];
			}
			if (!priority) {
				priority = 1;
			}
			module.swaggerModulePriority = priority;
			if (modules[phase].indexOf(module) < 0) {
				modules[phase].push(module);
			}
			modules[phase].sort(function(obj1, obj2) {
				if (obj1.swaggerModulePriority > obj2.swaggerModulePriority) {
					return -1;
				} else if (obj1.swaggerModulePriority < obj2.swaggerModulePriority) {
					return 1;
				}
				return 0;
			});
		};

		/**
		 * Runs modules' "execute" function one by one
		 */
		function executeAll(deferred, phaseModules, args, phaseExecuted) {
			var module = phaseModules.shift();
			if (module) {
				module
					.execute(args)
					.then(function(executed) {
						phaseExecuted = phaseExecuted || executed;
						executeAll(deferred, phaseModules, args, phaseExecuted);
					})
					.catch(deferred.reject);
			} else {
				deferred.resolve(phaseExecuted);
			}
		}

		/**
		 * Executes modules' phase
		 */
		this.execute = function(phase, args) {
			var deferred = $q.defer(),
				phaseModules = modules[phase] || [];

			if (!angular.isObject(args)) {
				console.warn('AngularSwaggerUI: module execution argument should be an object!');
			}
			executeAll(deferred, [].concat(phaseModules), args);
			return deferred.promise;
		};

	});
