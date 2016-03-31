var del = require('del'),
    runSequence = require('run-sequence');

module.exports = function(gulp, plugins, buildProperties) {
    gulp.task('clean', function(callback) {
        plugins.util.log('Cleaning: ' + buildProperties.distTarget);
        del([buildProperties.distTarget], callback);
    });

    // If we need another clean type, we'd create it here as clean:blahDirectory, or something.
    // gulp.task('cleanFromDirectories')
};
