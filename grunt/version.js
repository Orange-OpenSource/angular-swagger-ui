//
// grunt dev      -> launch tools (watch)
//
module.exports = function(grunt) {
	grunt.registerTask('version', '', function(version) {
		grunt.option('version', version);
		var tasks = [
			'string-replace:version',
			'string-replace:package'
		];
		grunt.task.run(tasks);
	});
};