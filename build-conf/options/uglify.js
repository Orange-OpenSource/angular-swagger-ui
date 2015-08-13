//
// Use to uglify JS
//
module.exports = {
	dist: {
		src: ['dist/scripts/swagger-ui.js'],
		dest: 'dist/scripts/swagger-ui.min.js'
	},
	distExternals: {
		src: ['dist/scripts/modules/swagger-external-references.js'],
		dest: 'dist/scripts/modules/swagger-external-references.min.js'
	},
	distXml: {
		src: ['dist/scripts/modules/swagger-xml-formatter.js'],
		dest: 'dist/scripts/modules/swagger-xml-formatter.min.js'
	}
}