/**
 * Created by ryankimber on 2016-03-10.
 */
var runSequence = require('run-sequence');

module.exports = function(gulp, plugins, buildProperties) {

    gulp.task('build:dist', function (callback) {
        runSequence('clean', 'scripts', 'sass', function () {
            console.log("Completed buildProd, calling callback...");
            if (callback) callback();
        });
    });

};