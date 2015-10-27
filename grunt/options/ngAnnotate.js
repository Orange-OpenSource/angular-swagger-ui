module.exports = {
	dist: {
		files: [{
			expand: true,
			cwd: 'dist/scripts',
			src: ['*.js', 'modules/*.js'],
			dest: 'dist/scripts'
		}]
	}
}