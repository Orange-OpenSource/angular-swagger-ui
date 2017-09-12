//
// grunt dev      -> launch tools (watch)
//
module.exports = function(grunt) {
	grunt.registerTask('dev', '', function(target) {
		var tasks = ['less:dev', 'connect:dev', 'watch'];
		grunt.task.run(tasks);
	});
};