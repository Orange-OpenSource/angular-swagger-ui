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
				'dist/scripts/swagger-client.js',
				'dist/scripts/swagger-model.js',
				'dist/scripts/templates.js',
				'dist/scripts/swagger-modules.js',
				'dist/scripts/swagger-parser.js',
				'dist/scripts/swagger-i18n.js',
				'dist/scripts/modules/swagger-external-references.js',
				'dist/scripts/modules/swagger-xml-formatter.js',
				'dist/scripts/modules/swagger1-to-swagger2-converter.js',
				'dist/scripts/modules/swagger-yaml-parser.js',
				'dist/scripts/modules/swagger-markdown.js',
				'dist/scripts/modules/swagger-auth.js',
				'dist/scripts/templates-auth.js',
				'dist/scripts/templates-auth-deps.js',
				'dist/scripts/i18n/en.js',
				'dist/scripts/i18n/fr.js',
				'dist/scripts/i18n/jp.js'
			]
		}]
	}

}