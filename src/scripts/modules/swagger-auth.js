/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUiAuthorization', ['swaggerUi', 'ui.bootstrap.modal'])
	.provider('swaggerUiAuth', function() {

		var authConfig;

		this.configuration = function(config) {
			if (config) {
				authConfig = config;
			}
			return authConfig;
		};

		this.$get = function($q, $uibModal) {

			return {

				configuration: function(config) {
					if (config) {
						authConfig = config;
					}
					return authConfig;
				},

				/**
				 * Module entry point
				 */
				execute: function(data) {
					var deferred = $q.defer(),
						modalInstance = $uibModal.open({
							templateUrl: 'templates/auth/modal-auth.html',
							controller: 'SwaggerUiModalAuthCtrl',
							backdrop: 'static',
							resolve: {
								securityDefinitions: function() {
									return data.securityDefinitions;
								},
								authConfig: function() {
									return authConfig;
								}
							}
						});

					modalInstance.result.then(function() {
						// validated, do nothing
					}, function() {
						// dismissed, do nothing
					});

					deferred.resolve(data);
					return deferred.promise;
				}

			};
		};

	})
	.controller('SwaggerUiModalAuthCtrl', function($scope, $http, $window, securityDefinitions, authConfig) {

		$scope.form = {};
		$scope.securityDefinitions = securityDefinitions;
		$scope.error = {};

		$scope.authorize = function(key) {
			var security = securityDefinitions[key];
			$scope.inProgress = true;
			$scope.error[key] = false;
			switch (security.type) {
				case 'apiKey':
					authApiKey(key);
					break;
				case 'basic':
					authBasic(key);
					break;
				case 'oauth2':
					switch (security.flow) {
						case 'application':
						case 'clientCredentials': // should not happen but it's the real oauth flow name
							oauth2ClientCredentials(key);
							break;
						case 'accessCode':
						case 'authorizationCode': // should not happen but it's the real oauth flow name
							oauth2AuthorizationCode(key);
							break;
						case 'implicit':
							oauth2Implicit(key);
							break;
						case 'password':
							oauth2PasswordCredentials(key);
							break;
					}
					break;
			}
		};

		$scope.logout = function(key) {
			var security = securityDefinitions[key];
			angular.forEach(['apiKey', 'clientId', 'clientSecret', 'login', 'password', 'selectedScopes', 'tokenType', 'accessToken'], function(key) {
				delete security[key];
			});
			security.valid = false;
			$scope.form[key] = {};
			$scope.error[key] = false;
		};

		function init() {
			angular.forEach(securityDefinitions, function(security, key) {
				security.authByLogin = security.type === 'basic' || (security.type === 'oauth2' && security.flow === 'password');
				security.authByClientId = security.type === 'oauth2' && ['application', 'clientCredentials', 'accessCode', 'implicit'].indexOf(security.flow) > -1;
				security.authByClientSecret = security.authByClientId && security.flow !== 'implicit';
				$scope.form[key] = $scope.form[key] || {};
				var creds = authConfig && authConfig[key] || null;
				switch (security.type) {
					case 'apiKey':
						$scope.form[key].apiKey = security.apiKey || creds;
						break;
					case 'oauth2':
						creds = creds || {};
						$scope.form[key].clientId = security.clientId || creds.clientId;
						$scope.form[key].clientSecret = security.clientSecret || creds.clientSecret;
						$scope.form[key].selectedScopes = security.selectedScopes || angular.copy(security.scopes);
						$scope.form[key].login = security.login || creds.login;
						$scope.form[key].password = security.password || creds.password;
						break;
					case 'basic':
						creds = creds || {};
						$scope.form[key].login = security.login || creds.login;
						$scope.form[key].password = security.password || creds.password;
						break;
				}
			});
		}

		function authApiKey(key) {
			var security = securityDefinitions[key];
			security.apiKey = $scope.form[key].apiKey;
			security.valid = true;
			$scope.inProgress = false;
		}

		function authBasic(key) {
			var security = securityDefinitions[key];
			security.login = $scope.form[key].login;
			security.password = $scope.form[key].password;
			security.tokenType = 'Basic';
			security.accessToken = btoa(security.login + ':' + security.password);
			security.valid = true;
			$scope.inProgress = false;
		}

		function oauth2ClientCredentials(key) {
			var security = securityDefinitions[key];
			security.clientId = $scope.form[key].clientId;
			security.clientSecret = $scope.form[key].clientSecret;
			getToken(key, 'grant_type=client_credentials', security.clientId, security.clientSecret);
		}

		function oauth2AuthorizationCode(key) {
			var security = securityDefinitions[key];
			oauth(security, 'code', function(data) {
				security.clientId = $scope.form[key].clientId;
				security.clientSecret = $scope.form[key].clientSecret;
				getToken(key, 'grant_type=authorization_code&code=' + data.code + '&redirect_uri=' + data.redirectUrl, security.clientId, security.clientSecret);
			});
		}

		function oauth2Implicit(key) {
			var security = securityDefinitions[key];
			oauth(key, 'token', function(data) {
				security.tokenType = data.token_type;
				security.accessToken = data.access_token;
				security.valid = true;
				$scope.inProgress = false;
			});
		}

		function oauth2PasswordCredentials(key) {
			var security = securityDefinitions[key];
			security.login = $scope.form[key].login;
			security.password = $scope.form[key].password;
			getToken(key, 'grant_type=password', security.login, security.password);
		}

		function getToken(key, body, id, secret) {
			var security = securityDefinitions[key],
				creds = authConfig && authConfig[key] || null;

			$http({
					method: 'POST',
					url: security.tokenUrl,
					headers: {
						Authorization: 'Basic ' + btoa(id + ':' + secret),
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					data: body,
					params: creds && creds.queryParams
				})
				.then(function(resp) {
					security.tokenType = resp.data.token_type;
					security.accessToken = resp.data.access_token;
					security.valid = true;
				})
				.catch(function(error) {
					$scope.inProgress = false;
					$scope.error[key] = 'failed to get oauth access token: ' + (error.message || error.status);
				});
		}

		function oauth(key, responseType, callback) {
			var query = [],
				security = securityDefinitions[key],
				creds = authConfig && authConfig[key] || null,
				redirectUrl = authConfig && authConfig.redirectUrl || null,
				state = btoa(new Date());

			query.push('response_type=' + responseType);
			if (redirectUrl) {
				query.push('redirect_uri=' + encodeURIComponent(redirectUrl));
			} else {
				$scope.error[key] = 'No redirect URI defined';
				return;
			}
			if ($scope.form[key].clientId) {
				query.push('client_id=' + encodeURIComponent($scope.form[key].clientId));
			}
			if ($scope.form[key].selectedScopes) {
				var scopes = [];
				angular.forEach($scope.form[key].selectedScopes, function(selected, name) {
					if (selected === true) {
						scopes.push(name);
					}
				});
				query.push('scope=' + encodeURIComponent(scopes.join(creds && creds.scopeSeparator || ' ')));
			}
			query.push('state=' + encodeURIComponent(state));
			if (creds && creds.queryParams) {
				angular.forEach(creds.queryParams, function(value, name) {
					query.push(name + '=' + encodeURIComponent(value));
				});
			}
			$window.redirectOauth2 = {
				state: state,
				redirectUrl: redirectUrl,
				flow: security.flow,
				callback: callback,
				error: function(error) {
					$scope.error[key] = error.message;
				}
			};
			$window.open(security.authorizationUrl + '?' + query.join('&'));
		}

		init();

	})
	.service('__swaggerUiAuthInit', function($q, swaggerUiAuth) {

		/** !!!!!!!!!!!!!!!!! SHOULD NOT BE USED BY ANYONE !!!!!!!!!!!!!!!! **/

		/**
		 * Module entry point
		 */
		this.execute = function(data) {
			var deferred = $q.defer(),
				authConfig = swaggerUiAuth.configuration();

			if (data && data.openApiSpec && authConfig) {
				angular.forEach(data.openApiSpec.securityDefinitions, function(securityDefinition, key) {
					var creds = authConfig[key] || null;
					if (creds) {
						switch (securityDefinition.type) {
							case 'apiKey':
								if (creds.apiKey) {
									securityDefinition.apiKey = creds.apiKey;
									securityDefinition.valid = true;
								}
								break;
							case 'basic':
								if (creds.login && creds.password) {
									securityDefinition.tokenType = 'Basic';
									securityDefinition.accessToken = btoa(creds.login + ':' + creds.password);
									securityDefinition.valid = true;
								}
								break;
						}
					}
				});
			}
			deferred.resolve(data);
			return deferred.promise;
		};

	})
	.run(function(swaggerModules, swaggerUiAuth, __swaggerUiAuthInit) {
		swaggerModules.add(swaggerModules.AUTH, swaggerUiAuth, 1);
		swaggerModules.add(swaggerModules.BEFORE_DISPLAY, __swaggerUiAuthInit, 1);
	});