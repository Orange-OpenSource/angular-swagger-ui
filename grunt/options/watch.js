//
// Watches files for changes and runs tasks based on the changed files
//
module.exports = {
    less: {
        files: ['src/less/{,*/}*.less'],
        tasks: ['less:dev']
    },
    js: {
        files: ['src/scripts/{,*/}*.js'],
        tasks: ['newer:jshint:all'],
    },
    livereload: {
        options: {
            livereload: '<%= connect.options.livereload %>'
        },
        files: [
            'src/{,*/}*.html',
            'src/css/{,*/}*.css',
            'src/scripts/{,*/}*.js'
        ]
    }
}