/*
 * Orange angular-swagger-ui - v0.3.2
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.provider('swaggerTranslator', function() {

		var currentLang = 'en',
			allTranslations = {};

		/**
		 * set startup language
		 */
		this.setLanguage = function(lang) {
			currentLang = lang;
			return this;
		};

		/**
		 * add translations for a specific language code
		 */
		this.addTranslations = function(lang, translations) {
			var map = allTranslations[lang] = allTranslations[lang] || {};
			angular.merge(map, translations);
			return this;
		};

		this.$get = function($rootScope, $interpolate) {
			return {
				/**
				 * change current used language
				 */
				useLanguage: function(lang) {
					if (typeof allTranslations[lang] === 'undefined') {
						console.error('AngularSwaggerUI: No translations found for language '+lang);
					}
					currentLang = lang;
					$rootScope.$emit('swaggerTranslateLangChanged');
				},
				/**
				 * get a localized message
				 */
				translate: function(key, values) {
					if (currentLang && allTranslations && allTranslations[currentLang] && allTranslations[currentLang][key]) {
						return $interpolate(allTranslations[currentLang][key])(values);
					} else {
						return key;
					}
				},
				/**
				 * get current used language
				 */
				language: function() {
					return currentLang;
				}
			};
		};
	})
	.directive('swaggerTranslate', function($rootScope, $parse, swaggerTranslator) {

		return {
			restrict: 'A',
			link: function(scope, element, attributes) {
				function translate() {
					var params;
					if (attributes.swaggerTranslateValue) {
						params = $parse(attributes.swaggerTranslateValue)(scope.$parent);
					}
					element.text(swaggerTranslator.translate(attributes.swaggerTranslate, params));
				}
				var unbind = $rootScope.$on('swaggerTranslateLangChanged', function() {
					translate();
				});
				scope.$on('$destroy', unbind);
				translate();
			}
		};

	})
	.filter('swaggerTranslate', function(swaggerTranslator) {

		var filter = function(input, option) {
			return swaggerTranslator.translate(input, option);
		};
		filter.$stateful = true;
		return filter;

	});