//
// Make sure code styles are up to par and there are no obvious mistakes
//
module.exports = {
	options: {
		jshintrc: 'grunt/.jshintrc',
		reporter: require('jshint-stylish'),
		force: true
	},
	all: {
		src: [
			'Gruntfile.js',
			'src/scripts/{,*/}*.js'
		]
	}
}