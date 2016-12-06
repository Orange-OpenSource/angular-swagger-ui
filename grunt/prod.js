//
// grunt prod      	 -> Build web portal 
//
module.exports = function(grunt) {

    grunt.registerTask('prod', '', function(target) {
        var tasks = [
            'jshint:all',
            'clean:predist',
            'less:distcompressed',
            'less:distuncompressed',
            'copy:dist',
            'html2js:dist',
            'html2js:dist-auth',
            'html2js:dist-auth-deps',
            'concat:dist',
            'ngAnnotate:dist',
            'uglify:dist',
            'clean:postdist',
            'concat:copyright'
        ];
        if (target === 'server') {
            tasks.push('connect:dist:keepalive');
        }
        grunt.task.run(tasks);

    });
};