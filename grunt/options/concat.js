//
// Use to concat templates with code
//
module.exports = {
	dist: {
		files: {
			'dist/scripts/swagger-ui.js': [
				'dist/scripts/swagger-ui.js',
				'dist/scripts/swagger-client.js',
				'dist/scripts/swagger-model.js',
				'dist/scripts/swagger-modules.js',
				'dist/scripts/modules/swagger2-json-parser.js',
				'dist/scripts/templates.js'
			]
		}
	},
	copyright: {
		files: {
			'dist/scripts/swagger-ui.min.js': [
				'copyright.txt',
				'dist/scripts/swagger-ui.min.js'
			],
			'dist/scripts/modules/swagger-external-references.min.js': [
				'copyright.txt',
				'dist/scripts/modules/swagger-external-references.min.js'
			],
			'dist/scripts/modules/swagger-xml-formatter.min.js': [
				'copyright.txt',
				'dist/scripts/modules/swagger-xml-formatter.min.js'
			],
			'dist/scripts/modules/swagger1-to-swagger2-converter.min.js': [
				'copyright.txt',
				'dist/scripts/modules/swagger1-to-swagger2-converter.min.js'
			]
		}
	}
}