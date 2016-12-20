/*
 * Orange angular-swagger-ui - v0.4.0
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUiAuthorization', ['swaggerUi', 'ui.bootstrap.modal'])
	.service('swaggerUiAuth', function($q, $uibModal) {

		/**
		 * Module entry point
		 */
		this.execute = function(operation, auth) {
			var deferred = $q.defer();
			$uibModal.open({
				templateUrl: 'templates/auth/modal-auth.html',
				controller: 'SwaggerUiModalAuthCtrl',
				backdrop: true,
				resolve: {
					auth: function() {
						return auth;
					},
					operation: function() {
						return operation;
					}
				}
			});
			deferred.resolve(true);
			return deferred.promise;
		};

	})
	.controller('SwaggerUiModalAuthCtrl', function($scope, operation, auth) {
		$scope.form = {};
		$scope.auth = auth;
		$scope.tab = 0;
		var authParams = operation.authParams || auth[0];
		if (authParams) {
			switch (authParams.type) {
				case 'apiKey':
					$scope.form.apiKey = authParams.apiKey;
					break;
				case 'basic':
					$scope.form.basicLogin = authParams.login;
					$scope.form.basicPassword = authParams.password;
					break;
			}
		}

		$scope.authorize = function() {
			var valid = false,
				authParams = operation.authParams = auth[$scope.tab];

			switch (authParams.type) {
				case 'apiKey':
					if ($scope.form.apiKey) {
						authParams.apiKey = $scope.form.apiKey;
						valid = true;
					} else {
						delete operation.authParams;
					}
					break;
				case 'basic':
					if ($scope.form.basicLogin === '' && $scope.form.basicPassword === '') {
						delete operation.authParams;
					} else {
						authParams.login = $scope.form.basicLogin;
						authParams.password = $scope.form.basicPassword;
						valid = true;
					}
					break;
			}
			auth[$scope.tab].valid = valid;
			$scope.$close();
		};

		$scope.setTab = function(index) {
			$scope.tab = index;
		};

	})
	.run(function(swaggerModules, swaggerUiAuth) {
		swaggerModules.add(swaggerModules.AUTH, swaggerUiAuth);
	});