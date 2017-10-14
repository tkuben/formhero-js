module.exports = function(gulp, plugins, buildProperties) {
    gulp.task('sftp', function() {

        return gulp.src(['api-docs/*', 'api-docs/**/*'])
            .pipe(plugins.sftp({
                host: buildProperties.sftp.host,
                port: buildProperties.sftp.port,
                user: buildProperties.sftp.username,
                pass: buildProperties.sftp.password
            }));
    });



    // If we need another clean type, we'd create it here as clean:blahDirectory, or something.
    // gulp.task('cleanFromDirectories')
};
