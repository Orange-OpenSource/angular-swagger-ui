module.exports = {
	version: {
		options: {
			replacements: [{
				pattern: /v[0-9].[0-9].[0-9]/,
				replacement: 'v<%= grunt.option("version") %>'
			}]
		},
		files: {
			'src/': 'src/**',
			'./': 'copyright.txt'
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