module.exports = function(grunt) {
    'use strict';

    var matchdep = require('matchdep'),
        config = {
            pkg: grunt.file.readJSON('package.json')
        };

    grunt.log.writeln(' ');
    grunt.log.writeln('********************** command help **********************');
    grunt.log.writeln(' ');
    grunt.log.writeln(' $ grunt $0:$1');
    grunt.log.writeln('');
    grunt.log.writeln(' $0');
    grunt.log.writeln('     dev         develop swagger-ui with webserver on 127.0.0.1:9002');
    grunt.log.writeln('     dist        build swagger-ui distribution');
    grunt.log.writeln('     version     update version number');
    grunt.log.writeln('');
    grunt.log.writeln(' $1 (optional) for dist');
    grunt.log.writeln('     server      swagger-ui distribution with webserver on 127.0.0.1:9003');
    grunt.log.writeln('');
    grunt.log.writeln(' $1 (required) for version');
    grunt.log.writeln('     x.x.x       version will be replaced in all required files');
    grunt.log.writeln('');

    /**
     * @description
     * Concatenate all .js files in path to a single object.
     *
     * Original source: http://www.thomasboyt.com/2013/09/01/maintainable-grunt.html
     *
     * @param {string} path Base path to the config files
     * @returns {object}
     */
    function loadTaskOptions(path) {
        var glob = require('glob'),
            taskOptions = {},
            key;

        glob.sync('*', {
            cwd: path
        }).forEach(function(option) {
            key = option.replace(/\.js$/, '');
            taskOptions[key] = require(path + option);
        });

        return taskOptions;
    }

    // Extend config with task options definitions
    grunt.util._.extend(config, loadTaskOptions('./grunt/options/'));

    // force line endings LF
    grunt.util.linefeed = '\n';

    grunt.initConfig(config);

    // Load all tasks from the dependencies in package.json
    matchdep.filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    // Load custom tasks from ./grunt/*.js
    grunt.loadTasks('grunt/');
};