//
// Use to clean files/directories
//
module.exports = {
	predist: {
		files: [{
			dot: true,
			src: [
				'dist/{,*/}*',
				'!dist/index.html'
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
				'dist/scripts/modules/swagger2-json-parser.js',
				'dist/scripts/modules/swagger-external-references.js',
				'dist/scripts/modules/swagger-xml-formatter.js',
				'dist/scripts/modules/swagger1-to-swagger2-converter.js'
			]
		}]
	}

}