//
// Use to inline templates
//
module.exports = {
	dist: {
		options: {
			module: 'swaggerUi',
			singleModule: true,
			existingModule: true,
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