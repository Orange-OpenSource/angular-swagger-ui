module.exports = {
	dev: {
		files: {
			'src/css/swagger-ui.css': 'src/less/main.less',
			'src/css/bootstrap.css': 'bower_components/bootstrap-less-only/less/bootstrap.less',
			'src/css/demo.css': 'src/less/demo.less',
		}
	},
	distcompressed: {
		options: {
			cleancss: true,
			compress: true
		},
		files: {
			'dist/css/swagger-ui.min.css': 'src/less/main.less',
			'dist/css/demo.css': 'src/less/demo.less',
		}
	},
	distuncompressed: {
		options: {
			cleancss: true
		},
		files: {
			'dist/css/swagger-ui.css': 'src/less/main.less'
		}
	}
}