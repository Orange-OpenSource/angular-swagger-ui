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
				'less/swagger-ui.less',
				'less/variables.less'
			]
		}]
	}
}