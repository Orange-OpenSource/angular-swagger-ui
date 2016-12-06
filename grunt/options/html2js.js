//
// Used to inline templates
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
			src: ['src/templates/*.html'],
			dest: 'dist/scripts/templates.js'
		}]
	},
	'dist-auth': {
		options: {
			module: 'swaggerUiAuthorization',
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
			src: ['src/templates/auth/*.html'],
			dest: 'dist/scripts/templates-auth.js'
		}]
	},
	'dist-auth-deps': {
		options: {
			base: 'bower_components/angular-ui-bootstrap',
			module: 'swaggerUiAuthorization',
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
			},
			rename: function(name) {
				return 'uib/' + name;
			}
		},
		files: [{
			src: ['bower_components/angular-ui-bootstrap/template/modal/*.html'],
			dest: 'dist/scripts/templates-auth-deps.js'
		}]
	}
}