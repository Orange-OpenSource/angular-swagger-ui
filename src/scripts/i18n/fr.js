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
			.addTranslations('fr', {
				infoContactCreatedBy: 'Créé par {{name}}',
				infoContactUrl: 'Plus d\'informations',
				infoContactEmail: 'Contacter le développeur',
				infoLicense: 'Licence: ',
				infoBaseUrl: 'URL',
				infoApiVersion: 'VERSION API',
				infoHost: 'HOTE',
				endPointToggleOperations: 'Ouvrir/Cacher',
				endPointListOperations: 'Lister les opérations',
				endPointExpandOperations: 'Ouvrir les opérations',
				operationDeprected: 'Attention: Obsolète',
				operationImplementationNotes: 'Notes d\'implementation',
				externalDocs: 'Documentation externe',
				headers: 'Entêtes de la réponse',
				headerName: 'Entêtes',
				headerDescription: 'Description',
				headerType: 'Type',
				parameters: 'Paramètres',
				parameterName: 'Paramètre',
				parameterValue: 'Valeur',
				parameterDescription: 'Description',
				parameterType: 'Type',
				parameterDataType: 'Type de données',
				parameterOr: ' ou ',
				parameterRequired: '(requis)',
				parameterModel: 'Modèle',
				parameterSchema: 'Exemple',
				parameterContentType: 'Type de paramètre',
				parameterDefault: '{{default}} (défaut)',
				parameterSetValue: 'Cliquer pour définir comme valeur de Paramètre',
				responseClass: 'Réponse (statut {{status}})',
				responseModel: 'Modèle',
				responseSchema: 'Exemple',
				responseContentType: 'Type de réponse',
				responses: 'Réponses',
				responseCode: 'Code HTTP',
				responseReason: 'Raison',
				responseHide: 'Cacher la réponse',
				modelOptional: 'optionnel',
				modelOr: ' ou ',
				explorerUrl: 'URL de la requète',
				explorerBody: 'Réponse',
				explorerCode: 'Code de la réponse',
				explorerHeaders: 'Entêtes de la réponse',
				explorerLoading: 'En cours ...',
				explorerTryIt: 'Essayer !',
				errorNoParserFound: 'Aucun parseur trouvé pour la spécification OpenApi au format {{type}}',
				errorParseFailed: 'Impossible de parser la spécification OpenApi : {{message}}',
				errorJsonParse: 'Impossible de parser le JSON',
				errorNoYamlParser: 'Aucun parseur YAML trouvé, veuillez vérifier que la librairie js-yaml est bien chargée',
				authRequired: 'Authentification requise',
				authAvailable: 'Authentifications disponibles',
				apiKey: 'Clé d\'API',
				authParamName: 'Nom',
				authParamType: 'Dans',
				authParamValue: 'Valeur',
				basic: 'Basic',
				authLogin: 'Identifiant',
				authPassword: 'Mot de passe',
				oauth2: 'oAuth2',
				authOAuthDesc: 'Les scopes sont utilisés pour autoriser une application à accéder aux données utilisateur de différants niveaux. Chaque API peut déclarer un ou plusieurs scopes. Cette API requiert les scopes suivants. Selectionnez ceux dont vous voulez l\'accès.',
				authAuthorizationUrl: 'URL d\'authorisation',
				authFlow: 'Séquence',
				authTokenUrl: 'URL du jeton',
				authScopes: 'Scopes',
				authDone: 'Fermer',
				authAuthorize: 'Valider',
				authClientId: 'Client ID',
				authClientSecret: 'Client secret',
				authLogout: 'Déconnexion',
				authLogged: 'Vous êtes actuellement authentifié'
			});

	});