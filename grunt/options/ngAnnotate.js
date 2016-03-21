module.exports = {
	dist: {
		files: [{
			expand: true,
			cwd: 'dist/scripts',
			src: ['**/*.js'],
			dest: 'dist/scripts'
		}]
	}
}