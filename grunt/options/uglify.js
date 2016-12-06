//
// Used to uglify JS
//
module.exports = {
	dist: {
		files: {
			'dist/scripts/swagger-ui.min.js': ['dist/scripts/swagger-ui.js'],
			'dist/scripts/modules/swagger-external-references.min.js': ['dist/scripts/modules/swagger-external-references.js'],
			'dist/scripts/modules/swagger-xml-formatter.min.js': ['dist/scripts/modules/swagger-xml-formatter.js'],
			'dist/scripts/modules/swagger1-to-swagger2-converter.min.js': ['dist/scripts/modules/swagger1-to-swagger2-converter.js'],
			'dist/scripts/modules/swagger-yaml-parser.min.js': ['dist/scripts/modules/swagger-yaml-parser.js'],
			'dist/scripts/modules/swagger-markdown.min.js': ['dist/scripts/modules/swagger-markdown.js'],
			'dist/scripts/modules/swagger-auth.min.js': ['dist/scripts/modules/swagger-auth.js'],
			'dist/scripts/i18n/fr.min.js': ['dist/scripts/i18n/fr.js'],
			'dist/scripts/i18n/jp.min.js': ['dist/scripts/i18n/jp.js']
		}
	}
}