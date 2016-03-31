var bourbon = require('node-bourbon').includePaths;


module.exports = function(gulp, plugins, buildProperties)
{
    gulp.task('sass', function(callback) {
        plugins.util.log('Building formhero.css...');

        return gulp.src(['src/**/*.scss'])
            .pipe(plugins.concat('formhero.css'))
            .pipe(plugins.streamify(plugins.size({ showFiles: true })))
            .pipe(plugins.sass({
                includePaths: bourbon
            }))
            .pipe(gulp.dest(buildProperties.distTarget))
            .pipe(plugins.minifyCss())
            .pipe(plugins.streamify(plugins.size({ showFiles: true })))
            .pipe(plugins.rename({
                suffix: ".min"
            }))
            .pipe(gulp.dest(buildProperties.distTarget))
            .on('error', plugins.util.log)
            .on('end', function(){
                plugins.util.log('Done building formhero.css...');
            });
    });
};