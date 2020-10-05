/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.directive('selectOnDbClick', function($window) {
		// helper to be able select all text on double click
		return {
			restrict: 'A',
			link: function(scope, element) {
				element.bind('dblclick', function() {
					var selection = $window.getSelection(),
						range = document.createRange();

					range.selectNodeContents(element[0]);
					selection.removeAllRanges();
					selection.addRange(range);
				});
			}
		};
	});