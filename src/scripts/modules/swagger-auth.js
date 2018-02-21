/*
 * Orange angular-swagger-ui - v0.5.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUiAuthorization', ['swaggerUi', 'ui.bootstrap.modal'])
	.provider('swaggerUiAuth', function() {

		var credentials;

		this.credentials = function(creds) {
			credentials = creds;
		};

		this.$get = function($q, $uibModal) {

			return {

				/**
				 * Module entry point
				 */
				execute : function(data) {
					var deferred = $q.defer(),
						modalInstance = $uibModal.open({
							templateUrl: 'templates/auth/modal-auth.html',
							controller: 'SwaggerUiModalAuthCtrl',
							backdrop: 'static',
							resolve: {
								auth: function() {
									return data.auth;
								},
								operation: function() {
									return data.operation;
								},
								credentials: function() {
									return credentials;
								}
							}
						});

					modalInstance.result.then(function() {
						// validated, do nothing
					}, function() {
						// dismissed, do nothing
					});

					deferred.resolve(true);
					return deferred.promise;
				}

			};
		};

	})
	.controller('SwaggerUiModalAuthCtrl', function($scope, $http, $window, operation, auth, credentials) {

		$scope.form = {};
		$scope.auth = auth;
		$scope.error = false;

		$scope.authorize = function() {
			$scope.inProgress = true;
			$scope.error = false;
			var authParams = operation.authParams = auth[$scope.tab];
			switch (authParams.type) {
				case 'apiKey':
					authApiKey(authParams);
					break;
				case 'basic':
					authBasic(authParams);
					break;
				case 'oauth2':
					switch (authParams.flow) {
						case 'application':
						case 'clientCredentials': // should not happen but it's the real oauth flow name
							oauth2ClientCredentials(authParams);
							break;
						case 'accessCode':
						case 'authorizationCode': // should not happen but it's the real oauth flow name
							oauth2AuthorizationCode(authParams);
							break;
						case 'implicit':
							oauth2Implicit(authParams);
							break;
						case 'password':
							oauth2PasswordCredentials(authParams);
							break;

					}
					break;
			}
		};

		$scope.setTab = function(index) {
			$scope.tab = index;
			var authParams = auth[index];
			$scope.authByLogin = authParams.type === 'basic' || (authParams.type === 'oauth2' && authParams.flow === 'password');
			$scope.authByClientId = authParams.type === 'oauth2' && ['application', 'clientCredentials', 'accessCode', 'implicit'].indexOf(authParams.flow) > -1;
			$scope.authByClientSecret = $scope.authByClientId && authParams.flow !== 'implicit' ? true : false;
		};

		$scope.logout = function() {
			var authParams = auth[$scope.tab];
			angular.forEach(['apiKey', 'clientId', 'clientSecret', 'login', 'password', 'selectedScopes', 'token_type', 'access_token'], function(key) {
				delete authParams[key];
			});
			authParams.valid = false;
		};

		function init() {
			$scope.setTab(0);
			var authParams = operation.authParams || auth[0];
			if (authParams) {
				var creds = credentials && credentials[authParams.type];
				switch (authParams.type) {
					case 'apiKey':
						$scope.form.apiKey = authParams.apiKey || (creds && creds.apiKey);
						break;
					case 'oauth2':
						$scope.form.clientId = authParams.clientId || (creds && creds.clientId);
						$scope.form.clientSecret = authParams.clientSecret || (creds && creds.clientSecret);
						$scope.form.selectedScopes = authParams.selectedScopes || angular.copy(authParams.scopes);
						// fall through
					case 'basic':
						$scope.form.login = authParams.login || (creds && creds.login);
						$scope.form.password = authParams.password || (creds && creds.password);
						break;
				}
			}
		}

		function authApiKey(authParams) {
			if ($scope.form.apiKey) {
				authParams.apiKey = $scope.form.apiKey;
				authParams.valid = true;
			} else {
				delete operation.authParams;
				authParams.valid = false;
			}
			$scope.inProgress = false;
			$scope.$close();
		}

		function authBasic(authParams) {
			if ($scope.form.basicLogin === '' && $scope.form.basicPassword === '') {
				delete operation.authParams;
				authParams.valid = false;
			} else {
				authParams.login = $scope.form.basicLogin;
				authParams.password = $scope.form.basicPassword;
				authParams.token_type = 'Basic';
				authParams.access_token = btoa(authParams.login + ':' + authParams.password);
				authParams.valid = true;
			}
			$scope.inProgress = false;
			$scope.$close();
		}

		function oauth2ClientCredentials(authParams) {
			if ($scope.form.clientId === '' && $scope.form.clientSecret === '') {
				delete operation.authParams;
				authParams.valid = false;
			} else {
				authParams.clientId = $scope.form.clientId;
				authParams.clientSecret = $scope.form.clientSecret;
				getToken(authParams, 'grant_type=client_credentials', authParams.clientId, authParams.clientSecret);
			}
		}

		function oauth2AuthorizationCode(authParams) {
			oauth(authParams, 'code', function(data) {
				authParams.clientId = $scope.form.clientId;
				authParams.clientSecret = $scope.form.clientSecret;
				getToken(authParams, 'grant_type=authorization_code&code=' + data.code + '&redirect_uri=' + data.redirectUrl, authParams.clientId, authParams.clientSecret);
			});
		}

		function oauth2Implicit(authParams) {
			oauth(authParams, 'token', function(data) {
				authParams.token_type = data.token_type;
				authParams.access_token = data.access_token;
				authParams.valid = true;
				$scope.inProgress = false;
				$scope.$close();
			});
		}

		function oauth2PasswordCredentials(authParams) {
			if ($scope.form.login === '' && $scope.form.password === '') {
				delete operation.authParams;
				authParams.valid = false;
			} else {
				authParams.login = $scope.form.login;
				authParams.password = $scope.form.password;
				getToken(authParams, 'grant_type=password', authParams.login, authParams.password);
			}
		}

		function getToken(authParams, body, id, secret) {
			var creds = credentials && credentials.oauth2;
			$http({
					method: 'POST',
					url: auth[$scope.tab].tokenUrl,
					headers: {
						Authorization: 'Basic ' + btoa(id + ':' + secret),
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					data: body,
					params: creds && creds.queryParams
				})
				.then(function(resp) {
					authParams.token_type = resp.data.token_type;
					authParams.access_token = resp.data.access_token;
					authParams.valid = true;
					$scope.$close();
				})
				.catch(function(error) {
					$scope.inProgress = false;
					$scope.error = 'failed to get oauth access token: ' + (error.message || error.status);
				});
		}

		function oauth(authParams, responseType, callback) {
			var query = [],
				creds = credentials && credentials.oauth2,
				state = btoa(new Date());

			query.push('response_type=' + responseType);
			if (creds && creds.redirectUrl) {
				query.push('redirect_uri=' + encodeURIComponent(creds.redirectUrl));
			} else {
				$scope.error = 'No redirect URI defined';
				return;
			}
			if ($scope.form.clientId) {
				query.push('client_id=' + encodeURIComponent($scope.form.clientId));
			}
			if ($scope.form.selectedScopes) {
				var scopes = [];
				angular.forEach($scope.form.selectedScopes, function(selected, name) {
					if (selected === true) {
						scopes.push(name);
					}
				});
				query.push('scope=' + encodeURIComponent(scopes.join(creds && creds.scopeSeparator || ' ')));
			}
			query.push('state=' + encodeURIComponent(state));
			if (creds && creds.realm) {
				query.push('realm=' + encodeURIComponent(creds.realm));
			}
			$window.redirectOauth2 = {
				state: state,
				redirectUrl: creds.redirectUrl,
				flow: authParams.flow,
				callback: callback,
				error: function(error) {
					$scope.error = error.message;
				}
			};
			$window.open(authParams.authorizationUrl + '?' + query.join('&'));
		}

		init();

	})
	.run(function(swaggerModules, swaggerUiAuth) {
		swaggerModules.add(swaggerModules.AUTH, swaggerUiAuth, 1);
	});