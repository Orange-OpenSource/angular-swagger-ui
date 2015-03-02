module.exports = function(grunt) {
    'use strict';

    var matchdep = require('matchdep'),
        config = {
            pkg: grunt.file.readJSON('package.json')
        };

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
    grunt.util._.extend(config, loadTaskOptions('./build-conf/options/'));

    grunt.initConfig(config);

    // Load all tasks from the dependencies in package.json
    matchdep.filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    // Load custom tasks from ./grunt/*.js
    grunt.loadTasks('build-conf/');
};