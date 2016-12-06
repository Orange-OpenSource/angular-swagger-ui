//
// grunt dev      -> launch tools (watch)
//
module.exports = function(grunt) {
	grunt.registerTask('version', '', function(version) {
		if (!version || version === '') {
			grunt.log.writeln(' ');
			grunt.log.error('Error: you must define version number !');
			grunt.log.writeln(' ');
			return;
		}
		grunt.option('version', version);
		var tasks = [
			'string-replace:version',
			'string-replace:package'
		];
		grunt.task.run(tasks);
	});
};