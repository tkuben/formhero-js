module.exports = function(gulp, plugins, buildProperties)
{
    var parallelize = require("concurrent-transform");

    gulp.task('deploy:prod', ['deploy:setProdPath', 'build:dist' /*, 'sftp'*/], function(){
        // create a new publisher
        return doDeploy('latest');
    });

    gulp.task('deploy:setBetaPath', function(callback) {
        buildProperties.deployPath = 'beta';
        buildProperties.hostOverride = 'var FORMHERO_HOST = \'dev.formhero.io\';';
        callback();

    });

    gulp.task('deploy:setProdPath', function(callback) {
        buildProperties.deployPath = 'latest';
        buildProperties.hostOverride = '//Use the default/production host formhero.io';
        callback();
    });

    function doDeploy(outputDir) {

        console.log("Using: ", buildProperties);

        var publisher = plugins.awspublish.create({
            "key": buildProperties.aws.key,
            "secret": buildProperties.aws.secret,
            "bucket": buildProperties.aws.bucket,
            "region": buildProperties.aws.region
        });

        // define custom headers
        var resourceHeaders = {
            'Cache-Control': 'max-age=0, no-transform, public',   //Change to 1209600
            'Content-Encoding': 'gzip'
        };

        var downloadableFileHeader = {
            'Cache-Control': 'max-age=0, no-transform, public',   //Change to 1209600
            'Content-Disposition' : 'attachment'
        };

        var limitedCacheHeaders = {
            'Cache-Control': 'max-age=0, no-transform, public', //Max age 15 minutes : 60sec/minute*15minutes = 900sec
            'Content-Encoding': 'gzip'
        };

        console.log("...starting upload...");
        return gulp.src([buildProperties.distTarget + '/*'])
            .pipe(plugins.rename(function (path) {
                path.dirname = '/' + outputDir + '/' + path.dirname;
            }))
            .pipe(plugins.awspublish.gzip())
            .pipe(parallelize(publisher.publish(resourceHeaders), 10))
            .pipe(plugins.awspublish.reporter())
            .on('end', function(){
                console.log("Done.");
            });

    }

    gulp.task('deploy:dev', ['deploy:setBetaPath', 'build:dist'], function() {
        return doDeploy('beta');
    })
};