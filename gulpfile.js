'use strict';

var _                   = require('lodash'),
    glob                = require('glob'),
    gulp                = require('gulp'),
    path                = require('path'),
    plugins             = require('gulp-load-plugins')(),
    runSequence         = require('run-sequence');

var buildProperties = {
    distTarget        : require('path').resolve('./dist')
};

//Override our options with what's loaded from ./gulp-config.json
buildProperties = _.extend(require('./gulp-config.json').config.prod, buildProperties);

//Dynamically load all of the task definitions in ./gulp-tasks/*.js
glob.sync( './gulp-tasks/*.js' ).forEach( function( file ) {
    try {
        require(path.resolve(file))(gulp, plugins, buildProperties);
    }catch(e) {
        console.log("\r\nUnable to load gulp tasks from " + file + ": Expecting file to export function(gulp, plugins, buildProperties){...}\r\n");
        console.log(e.stack);
    }
});

gulp.task('default', function(callback) {
    runSequence('build:dist', callback);
});