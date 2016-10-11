//
// grunt dev      -> launch tools (watch)
//
module.exports = function(grunt) {
	grunt.registerTask('dev', '', function(target) {
		var tasks = ['less:dev'];
		if (target === 'server') {
			tasks.push('connect:dev');
		}
		tasks.push('watch');
		grunt.task.run(tasks);
	});
};