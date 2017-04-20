module.exports = function(gulp, plugins, buildProperties)
{
    gulp.task('scripts', function(callback) {
        //We're supposed to be copying all of the stuff from static over.
        var cssDir = '${deploy.path}';
        return gulp.src([
                './node_modules/es6-promise-polyfill/promise.js',
                './src/*.js',
                './src/**/*.js',
                '!./**/*.min.js'
            ])
            .pipe(plugins.concat('formhero.js'))
            .pipe(plugins.replace('${deploy.path}', buildProperties.deployPath))
            .pipe(plugins.replace('${hostOverride}', buildProperties.hostOverride))
            .pipe(gulp.dest(buildProperties.distTarget))
            .pipe(plugins.streamify(plugins.uglify({ mangle: true, preserveComments: 'license' })))
            .pipe(plugins.rename({
                suffix: ".min"
            }))
            .pipe(gulp.dest(buildProperties.distTarget));
    });
};

