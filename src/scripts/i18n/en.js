/*
 * Orange angular-swagger-ui - v0.3.2
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
				parameterSchema: 'Model schema',
				parameterContentType: 'Parameter content type',
				parameterDefault: '{{default}} (default)',
				parameterSetValue: 'Click to set as parameter value',
				responseClass: 'Response class (status {{status}})',
				responseModel: 'Model',
				responseSchema: 'Model schema',
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
				errorNoParserFound: 'No parser found for Swagger specification of type {{type}} and version {{version}}',
				errorParseFailed: 'Failed to parse Swagger specification: {{message}}',
				errorJsonParse: 'Failed to parse JSON',
				errorNoYamlParser: 'No YAML parser found, please make sure to include js-yaml library'
			});

	});