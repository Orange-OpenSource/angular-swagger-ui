/*
 * Orange angular-swagger-ui - v0.6.5
 *
 * (C) 2015 Orange, all right reserved
 * MIT Licensed
 */
'use strict';

angular
	.module('swaggerUi')
	.config(function(swaggerTranslatorProvider) {

		swaggerTranslatorProvider
			.addTranslations('en', {
				infoContactCreatedBy: 'Created by {{name}}',
				infoContactUrl: 'See more at',
				infoContactEmail: 'Contact the developer',
				infoLicense: 'License: ',
				infoBaseUrl: 'BASE URL',
				infoApiVersion: 'API VERSION',
				infoHost: 'HOST',
				endPointToggleOperations: 'Open/Hide',
				endPointListOperations: 'List operations',
				endPointExpandOperations: 'Expand operations',
				operationDeprected: 'Warning: Deprecated',
				operationImplementationNotes: 'Implementation notes',
				externalDocs: 'External docs',
				headers: 'Response headers',
				headerName: 'Header',
				headerDescription: 'Description',
				headerType: 'Type',
				parameters: 'Parameters',
				parameterName: 'Parameter',
				parameterValue: 'Value',
				parameterDescription: 'Description',
				parameterType: 'Parameter type',
				parameterDataType: 'Data type',
				parameterOr: ' or ',
				parameterRequired: '(required)',
				parameterModel: 'Model',
				parameterSchema: 'Example value',
				parameterContentType: 'Parameter content type',
				parameterDefault: '{{default}} (default)',
				parameterSetValue: 'Click to set as parameter value',
				responseClass: 'Response class (status {{status}})',
				responseModel: 'Model',
				responseSchema: 'Example value',
				responseContentType: 'Response content type',
				responses: 'Response messages',
				responseCode: 'HTTP status code',
				responseReason: 'Reason',
				responseHide: 'Hide response',
				modelOptional: 'optional',
				modelOr: ' or ',
				explorerUrl: 'Request URL',
				explorerBody: 'Response body',
				explorerCode: 'Response code',
				explorerHeaders: 'Response headers',
				explorerLoading: 'Loading...',
				explorerTryIt: 'Try it out!',
				errorNoParserFound: 'No parser found for OpenApi specification of type {{type}}',
				errorParseFailed: 'Failed to parse OpenApi specification: {{message}}',
				errorJsonParse: 'Failed to parse JSON',
				errorNoYamlParser: 'No YAML parser found, please make sure to include js-yaml library',
				authRequired: 'Authorization required',
				authAvailable: 'Available authorizations',
				apiKey: 'API key authorization',
				authParamName: 'Name',
				authParamType: 'In',
				authParamValue: 'Value',
				basic: 'Basic authorization',
				authLogin: 'Login',
				authPassword: 'Password',
				oauth2: 'oAuth2 authorization',
				authOAuthDesc: 'Scopes are used to grant an application different levels of access to data on behalf of the end user. Each API may declare one or more scopes. API requires the following scopes. Select which ones you want to grant.',
				authAuthorizationUrl: 'Authorization URL',
				authFlow: 'Flow',
				authTokenUrl: 'Token URL',
				authScopes: 'Scopes',
				authDone: 'Done',
				authAuthorize: 'Authorize',
				authClientId: 'Client ID',
				authClientSecret: 'Client secret',
				authLogout: 'Logout',
				authLogged: 'You\'re currently logged in'
			});

	});