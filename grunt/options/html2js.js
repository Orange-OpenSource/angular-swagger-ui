//
// Use to inline templates
//
module.exports = {
	dist: {
		options: {
			module: 'swaggerUiTemplates', // no bundle module for all the html2js templates
			quoteChar: '\'',
			htmlmin: {
				collapseWhitespace: true,
				conservativeCollapse: true,
				collapseBooleanAttributes: true,
				removeCommentsFromCDATA: true,
				removeOptionalTags: true,
				removeComments: true
			}
		},
		files: [{
			src: ['src/templates/{,*/}*.html'],
			dest: 'dist/scripts/templates.js'
		}]
	}
}