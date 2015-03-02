//
// Launch web server thanks to NodeJS
//

module.exports = {
    options: {
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: '127.0.0.1',
        livereload: 35729
    },
    //
    // Define a web server to test development
    //
    dev: {
        options: {
            port: 9000,
            open: true,
            base: 'src',
            middleware: function(connect, options, middlewares) {
                // configure & add middlewares:
                middlewares.unshift(
                    connect().use('/bower_components', connect.static('./bower_components')),
                    connect.static('src')
                );
                return middlewares;
            }
        }
    },
    //
    // Define a web server to test production
    //
    dist: {
        options: {
            port: 9001,
            open: true,
            livereload: false,
            base: 'dist'
        }
    }
}