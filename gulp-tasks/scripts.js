module.exports = function(gulp, plugins, buildProperties)
{
    gulp.task('scripts', function(callback) {
        //We're supposed to be copying all of the stuff from static over.
        return gulp.src([
                './src/*.js',
                './src/**/*.js',
                '!./**/*.min.js'
            ])
            .pipe(plugins.concat('formhero.js'))
            .pipe(gulp.dest(buildProperties.distTarget))
            .pipe(plugins.streamify(plugins.uglify({ mangle: true, preserveComments: 'license' })))
            .pipe(plugins.rename({
                suffix: ".min"
            }))
            .pipe(gulp.dest(buildProperties.distTarget));
    });
};

