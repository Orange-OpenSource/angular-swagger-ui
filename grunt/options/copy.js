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
				'oauth2-redirect.html',
				'scripts/{,*/}*.js',
				'less/swagger-ui.less',
				'less/variables.less'
			]
		}]
	}
}