module.exports = {
	version: {
		options: {
			replacements: [{
				pattern: /v[0-9].[0-9].[0-9]/,
				replacement: 'v<%= grunt.option("version") %>'
			}]
		},
		files: {
			'src/': ['src/index.html', 'src/scripts/**', 'src/less/main.less'],
			'./': 'copyright.txt',
			'dist/': 'dist/index.html'
		}
	},
	package: {
		options: {
			replacements: [{
				pattern: /"version": "[0-9].[0-9].[0-9]"/,
				replacement: '"version": "<%= grunt.option("version") %>"'
			}]
		},
		files: {
			'./': ['bower.json', 'package.json']
		}
	}
}