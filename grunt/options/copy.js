//
// Copy files
//
module.exports = {
	dist: {
		files: [{
			expand: true,
			dot: true,
			cwd: 'src',
			dest: 'dist',
			src: [
				'scripts/{,*/}*.js',
				'!scripts/swagger-ui-templates.js',
				'less/swagger-ui.less'
			]
		}]
	}
}