/*
 * Orange angular-swagger-ui - v0.3.2
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerUiXmlFormatter', function($q) {

		/**
		 * Module entry point
		 */
		this.execute = function(response) {
			var executed = false,
				deferred = $q.defer(),
				contentType = response.headers && response.headers()['content-type'];

			if (contentType && contentType.toLowerCase().indexOf('/xml') > 0) {
				response.data = formatXml(response.data);
				executed = true;
			}
			deferred.resolve(executed);
			return deferred.promise;
		};

		function formatXml(xml) {
			var formatted = '',
				reg = /(>)(<)(\/*)/g,
				pad = 0;

			xml = xml.replace(reg, '$1\r\n$2$3');
			angular.forEach(xml.split('\r\n'), function(node) {
				var indent = 0,
					padding = '';

				if (node.match(/.+<\/\w[^>]*>$/)) {
					indent = 0;
				} else if (node.match(/^<\/\w/)) {
					if (pad !== 0) {
						pad -= 1;
					}
				} else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
					indent = 1;
				} else {
					indent = 0;
				}

				for (var i = 0; i < pad; i++) {
					padding += '    ';
				}

				formatted += padding + node + '\r\n';
				pad += indent;
			});

			return formatted;
		}

	})
	.run(function(swaggerModules, swaggerUiXmlFormatter) {
		swaggerModules.add(swaggerModules.AFTER_EXPLORER_LOAD, swaggerUiXmlFormatter);
	});