//
// Use to uglify JS
//
module.exports = {
	dist: {
		/*src: ['dist/scripts/swagger-ui.js'],
		dest: 'dist/scripts/swagger-ui.min.js'*/
		files: {
			'dist/scripts/swagger-ui.min.js': ['dist/scripts/swagger-ui.js'],
			'dist/scripts/modules/swagger-external-references.min.js': ['dist/scripts/modules/swagger-external-references.js'],
			'dist/scripts/modules/swagger-xml-formatter.min.js': ['dist/scripts/modules/swagger-xml-formatter.js'],
			'dist/scripts/modules/swagger1-to-swagger2-converter.min.js': ['dist/scripts/modules/swagger1-to-swagger2-converter.js']
		}
	}/*,
	distExternals: {
		src: ['dist/scripts/modules/swagger-external-references.js'],
		dest: 'dist/scripts/modules/swagger-external-references.min.js'
	},
	distXml: {
		src: ['dist/scripts/modules/swagger-xml-formatter.js'],
		dest: 'dist/scripts/modules/swagger-xml-formatter.min.js'
	}*/
}