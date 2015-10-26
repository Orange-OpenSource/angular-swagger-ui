//
// Use to uglify JS
//
module.exports = {
	dist: {
		files: {
			'dist/scripts/swagger-ui.min.js': ['dist/scripts/swagger-ui.js'],
			'dist/scripts/modules/swagger-external-references.min.js': ['dist/scripts/modules/swagger-external-references.js'],
			'dist/scripts/modules/swagger-xml-formatter.min.js': ['dist/scripts/modules/swagger-xml-formatter.js'],
			'dist/scripts/modules/swagger1-to-swagger2-converter.min.js': ['dist/scripts/modules/swagger1-to-swagger2-converter.js']
		}
	}
}