//
// Used to clean files/directories
//
module.exports = {
	predist: {
		files: [{
			dot: true,
			src: [
				'dist/{,*/}*',
				'!dist/index.html',
				'!dist/favicon.ico'
			]
		}]
	},
	postdist: {
		files: [{
			dot: true,
			src: [
				'dist/scripts/services/swagger-client.js',
				'dist/scripts/services/swagger-model.js',
				'dist/scripts/services/swagger-modules.js',
				'dist/scripts/services/swagger-parser.js',
				'dist/scripts/services/swagger-loader.js',
				'dist/scripts/services/swagger-i18n.js',
				'dist/scripts/modules/swagger-external-references.js',
				'dist/scripts/modules/swagger-xml-formatter.js',
				'dist/scripts/modules/swagger1-converter.js',
				'dist/scripts/modules/openapi3-converter.js',
				'dist/scripts/modules/swagger-yaml-parser.js',
				'dist/scripts/modules/swagger-markdown.js',
				'dist/scripts/modules/swagger-auth.js',
				'dist/scripts/modules/swagger-auth-ui-bootstrap-modal.js',
				'dist/scripts/templates.js',
				'dist/scripts/templates-auth.js',
				'dist/scripts/templates-auth-deps.js',
				'dist/scripts/i18n/en.js',
				'dist/scripts/i18n/fr.js',
				'dist/scripts/i18n/jp.js'
			]
		}]
	}

}