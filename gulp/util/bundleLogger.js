/*
 provide bundle logging to browserify bundle method
 */

var gutil        = require('gulp-util');
var prettyHrtime = require('pretty-hrtime');
var startTime;

module.exports = {
    start: function(filepath) {
        startTime = process.hrtime();
        gutil.log('Creating bundle ', gutil.colors.green(filepath) + '...');
    },

    watch: function(bundleName) {
        gutil.log('Watching files required by ', gutil.colors.yellow(bundleName));
    },

    end: function(filepath) {
        var taskTime = process.hrtime(startTime);
        var prettyTime = prettyHrtime(taskTime);
        gutil.log('Bundled ', gutil.colors.green(filepath), ' in ', gutil.colors.magenta(prettyTime));
    }
};