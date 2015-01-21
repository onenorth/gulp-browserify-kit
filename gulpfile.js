/*
 *  Gulpfile
 *  https://github.com/gulpjs/gulp/blob/master/docs/API.md
 *  https://github.com/gulpjs/gulp/tree/master/docs/recipes
 * =====================================================================
 */
'use strict';

// node modules
var gulp            = require('gulp'),
    $               = require('gulp-load-plugins')(),
    argv            = require('yargs').argv,
    del             = require('del'),
    minimist        = require('minimist'),
    runSequence     = require('run-sequence'),
    browserSync     = require('browser-sync'),
    browserify      = require('browserify'),
    watchify        = require('watchify'), // watch for browserify builds
    buffer          = require('vinyl-buffer'),
    source          = require('vinyl-source-stream'),
    prettyHrtime    = require('pretty-hrtime'),
    reload          = browserSync.reload;

/**
 * Browserify Bundle Logger helper function
 * =====================================================================
 */
var startTime;
var bundleLogger = {
    start: function(filepath) {
        startTime = process.hrtime();
        $.util.log('Bundling ', $.util.colors.green(filepath));
    },

    watch: function(bundleName) {
        $.util.log('Watching', $.util.colors.yellow(bundleName));
    },

    end: function(filepath) {
        var taskTime = process.hrtime(startTime);
        var prettyTime = prettyHrtime(taskTime);
        $.util.log('Bundled', $.util.colors.green(filepath), ' in ', $.util.colors.magenta(prettyTime));
    }
};

/**
 * Custom Error Handler function
 * =====================================================================
 */
var handleErrors = function() {
    var args = Array.prototype.slice.call(arguments);

    // push error to notification center
    $.notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
    }).apply(this, args);

    // make sure gulp doesn't choke on this task
    this.emit('end');
};


/**
 * Process CLI Arguments
 * =====================================================================
 */
// [1] - coerce to bool with double-bang
var production = !!argv.production // [1]
var build = argv._.length ? argv._[0] === 'build' : false;
var watch = argv._.length ? argv._[0] === 'watch' : true;

// load gulp task config.js configuration file
var config = require(process.cwd() + '/config.js');

// modules installed with npm that are used
// on the front-end and should be copied
// over from the node_modules folder into
// the front end assets folder
var frontEndModules = [
    './node_modules/jquery/dist/jquery.min.js',
    './node_modules/lodash/dist/lodash.min.js'
];

/**
 * Lint CSS
 * =====================================================================
 */
gulp.task('csslint', function() {
    return gulp.src(config.csslint.src)
        .pipe($.cached('csslint'))
        .pipe($.csslint(config.csslint.options));
});

/**
 * Lint JavaScript
 * =====================================================================
 */
gulp.task('jshint', function () {
    return gulp.src(config.jshint.src)
        .pipe($.cached('jshint'))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});


/**
 * Optimize Images
 * =====================================================================
 */
gulp.task('images', function () {
    return gulp.src(config.images.src)
        // we use gulp-changed instead of gulp-cached because
        // we don't want to keep large binary data in memory
        // gulp-changed checks file timestamps, and is much more
        // efficient than gulp-cached when handling binary data
        .pipe($.changed(config.images.dest))
        .pipe(gulp.dest(config.images.dest));
});

/**
 * Base64 smaller image assets referenced in stylesheets
 * =====================================================================
 */
gulp.task('base64', ['styles'], function() {
    return gulp.src(config.base64.src)
        .pipe($.base64(config.base64.options))
        .pipe(gulp.dest(config.base64.dest));
});

/**
 * Copy fonts to build folder
 * =====================================================================
 */
gulp.task('fonts', function () {
    return gulp.src(config.fonts.src)
        .pipe(gulp.dest(config.fonts.dest));
});


/**
 * Sass compilation + Autoprefixer + Minification
 *
 * [1] - expanded and compact are not supported in libass
 * =====================================================================
 */
gulp.task('styles', function () {
    config.sass.options.onError = browserSync.notify;

    browserSync.notify('Compiling Sass');
    // make this more-specific; exclude partials from source
    return gulp.src(config.sass.src)
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        // pipe the changed files through sass transformer
        .pipe($.sass(config.sass.options))
        // autoprefix resulting css
        .pipe($.autoprefixer(config.autoprefixer))
        .pipe($.sourcemaps.write('./', {includeContent: false}))
        // create/write the resulting stylesheet css file
        .pipe(gulp.dest(config.sass.dest));
});


/* = Sass compilation + Autoprefixer + Minification */


/**
 *  JavaScript processing with Browserify
 * =====================================================================
 */

gulp.task('scripts', function(callback) {

    browserSync.notify('Compiling JavaScript', 1000);

    var settings = config.browserify;

    var bundleQueue = settings.bundleConfigs.length;

    var browserifyThis = function( bundleConfig ) {

        var bundler = browserify({
            // watchify args
            cache: {}, packageCache: {}, fullPaths: true,
            // app entry point
            entries: bundleConfig.entries,
            // optional file extensions allowed in require
            extensions: settings.extensions,
            // should enable source maps?
            debug: settings.debug
        });

        function bundle() {
            // log when starting a bundle
            bundleLogger.start(bundleConfig.outputName);

            return bundler
                .bundle()
                // report any errors during compilation
                .on('error', handleErrors)
                // make stream compatible with gulp
                // and specify output file name
                .pipe(source(bundleConfig.outputName))
                // output destination
                .pipe(gulp.dest(bundleConfig.dest))
                .on('end', reportFinished);
        };

        if (global.isWatching) {
            // log informational message to console indicating that
            // watchify is enabled
            bundleLogger.watch(bundleConfig.outputName);
            // wrap with watchify and re-bundle
            bundler = watchify(bundler);
            // re-bundle after updates
            bundler.on('update', bundle);
        } else {
            // handle shared dependencies
            // bundler.require exposes modules externally
            if( bundleConfig.require ) {
                bundler.require(bundleConfig.require);
            }

            // bundler.external prevents specified modules from being included in
            // the bundle, and expects the excluded modules to be available
            // externally
            if ( bundleConfig.external ) {
                bundler.external(bundleConfig.external);
            }
        }

        var reportFinished = function() {
            // log bundling complete
            bundleLogger.end(bundleConfig.outputName);

            if (bundleQueue) {
                bundleQueue--;

                if (bundleQueue === 0) {
                    // if queue is empty, tell gulp the task is finished
                    callback && callback();
                }
            }
        };

        return bundle();
    };

    // Bundle each specified bundle config
    settings.bundleConfigs.forEach(browserifyThis);
});

/* = JavaScript processing with Browserify */


/**
 * Find all useref-tagged includes in html and copy over to dist folder
 * =====================================================================
 */
gulp.task('templates', function () {
    return gulp.src(config.templates.src)
        .pipe($.cached('templates'))
        .pipe(gulp.dest(config.templates.dest));
});


/**
 * Clean
 *
 * Deletes everything in the configured folder(s)
 *
 * NOTE: Must handle callback because we are not using the gulp pipeline for this task (too much overhead - pipeline not needed), and because calling this via run-sequence requires that non-pipeline tasks handle callbacks properly
 * =====================================================================
 */
gulp.task('clean', function(callback) {
    del(config.clean.src, callback);
});


/**
 *  Watch files for changes / reload BrowserSync
 * =====================================================================
 */
gulp.task('browsersync', ['build'], function() {
    browserSync(config.browsersync);
});

// need to use filter so as only to copy over fed modules
gulp.task('nodemodules', function() {
    return gulp.src(frontEndModules, {base: './node_modules'})
        .pipe(gulp.dest('dist/node_modules/'))
        .pipe($.size());
});

gulp.task('fonts', function() {
    return gulp.src('app/assets/fonts/**/*', {base: './app/assets/fonts'})
        .pipe(gulp.dest('dist/assets/fonts/'))
        .pipe($.size());
});

gulp.task('json', function() {
    return gulp.src('app/data/**/*.json', {base: './app/data'})
        .pipe($.cached('json'))
        .pipe(gulp.dest('dist/data/'))
        .pipe($.size());
});

gulp.task('extras', function() {
    return gulp.src([
            'app/*.txt',
            'app/*.ico'
        ])
        .pipe($.cached('extras'))
        .pipe(gulp.dest('dist/'))
        .pipe($.size());
});

gulp.task('optimize:css', function() {
    return gulp.src(config.optimize.css.src)
        .pipe($.minifyCss(config.optimize.css.options))
        .pipe(gulp.dest(config.optimize.css.dest))
        .pipe($.size());
});

gulp.task('optimize:js', function() {
    return gulp.src(config.optimize.js.src)
        .pipe($.uglify(config.optimize.js.options))
        .pipe(gulp.dest(config.optimize.js.dest))
        .pipe($.size());
});

gulp.task('optimize:images', function() {
    return gulp.src(config.optimize.images.src)
        .pipe($.imagemin(config.optimize.images.options))
        .pipe(gulp.dest(config.optimize.images.dest))
        .pipe($.size());
});


/**
 * Build
 *
 * Uses runSequence to enforce task execution order
 * Tasks run in the following order:
 *     - clean
 *     - sass, scripts, images, fonts, extras (in parallel)
 *     - base64
 *     - callback (optional)
 * =====================================================================
 */
gulp.task('build', function(callback) {
    runSequence('clean',
    [
        'templates',
        'styles',
        'scripts',
        'images',
        'fonts',
        'extras'
    ],
    'base64',
    callback);
});

/**
 * Production Build
 *
 * =====================================================================
 */
gulp.task('build:production', function(callback) {
    runSequence('clean',
    [
        'templates',
        'styles',
        'scripts',
        'images',
        'fonts',
        'extras'
    ],
    'base64',
    [
        'optimize:css',
        'optimize:js',
        'optimize:images'
    ],
    callback);
});

// Watch task
gulp.task('watch', ['browsersync'], function() {
    gulp.watch(config.watch.templates, ['templates']);
    gulp.watch(config.watch.sass, ['styles', 'csslint']);
    gulp.watch(config.watch.scripts, ['scripts', 'jshint']);
    gulp.watch(config.watch.images, ['images']);
    // gulp.watch(config.watch.svg, ['fonts']);
    gulp.watch(config.watch.sprites, ['sprites']);

    // gulp.watch(['app/data/**/.json'], ['json', reload]);
    // gulp.watch(['app/**/*.html'], ['html', reload]);
    // gulp.watch(['app/assets/styles/**/*.{sass,scss}'], ['styles', reload]);
    // gulp.watch(['app/assets/images/**/*'], ['images', reload]);
});

// Default task
gulp.task('default', ['build']);


/**
 *  Generate sprite and CSS file from png files
 * =====================================================================
 */
// gulp.task('build:sprites', function() {
//     var spriteConfig = config.sprites;

//     // use spritesmith to build the sprite image and sprite css
//     // from the constituent images
//     var spriteData = gulp
//                         .src(spriteConfig.src)
//                         .pipe(g.spritesmith(spriteConfig.options));

//     // pipe the sprite image to the configured image folder
//     spriteData.img
//         .pipe(gulp.dest(spriteConfig.dest.image));
//     // pipe the sprite css to the configured css folder
//     spriteData.css
//         .pipe(gulp.dest(spriteConfig.dest.css));
// });

// /* = Generate sprite and CSS file from png files */


// /**
//  *  Build All process
//  * =====================================================================
//  */
// gulp.task('build:all', function(callback) {
//     // first, run the delete task
//     // then run the array of tasks (they will run in parallel)
//     // then run the base64 task
//     // finally, execute optional callback
//     // we need to use an order, controlled sequence here because
//     // we don't want to run the base64 task until
//     // the sass has been processed into css
//     runSequence('delete',
//     [
//         'build:css',
//         'build:js',
//         'copy:templates',
//         'copy:images',
//         'copy:fonts'
//     ],
//     'base64',
//     callback);
// });

// /* = Build all */

// /**
//  *  Copy templates (e.g., layouts)
//  * =====================================================================
//  */
// gulp.task('copy:templates', function() {
//     var templateConfig = config.templates;

//     browserSync.notify('Copying Templates');

//     return gulp.src(templateConfig.src)
//         .pipe(gulp.dest(templateConfig.dest));
// });

// /* = Copy templates */


// /**
//  *  Reload templates
//  * =====================================================================
//  */
// gulp.task('reload:templates', ['copy:templates'], function() {
//     browserSync.reload();
// });

// /* = Reload templates */


// /**
//  *  Copy changed images to build folder
//  * =====================================================================
//  */
// gulp.task('copy:images', function() {
//     var imageConfig = config.images;

//     return gulp.src(imageConfig.src)
//         .pipe(g.changed(imageConfig.dest)) // Ignore unchanged files
//         .pipe(gulp.dest(imageConfig.dest));
// });

// /* = Copy changed images */


// *
//  *  Copy fonts to build folder
//  * =====================================================================

// gulp.task('copy:fonts', function() {
//     var fontConfig = config.copyfonts.development;

//     return gulp.src(fontConfig.src)
//         .pipe(g.changed(fontConfig.dest)) // Ignore changed files
//         .pipe(gulp.dest(fontConfig.dest));
// });

// /* = Copy fonts */



// /**
//  *  Replace image URLs in CSS with base64 encoded data
//  * =====================================================================
//  */
// gulp.task('base64', ['build:css'], function() {
//     var base64Config = config.base64;

//     return gulp.src(base64Config.src)
//         .pipe(g.base64(base64Config.options))
//         .pipe(gulp.dest(base64Config.dest));
// });

// /* = Replace image URLs in CSS with base64 encoded data */


// /**
//  *  Delete / Clean build folders and files
//  * =====================================================================
//  */
// gulp.task('delete', function(callback) {
//     var delConfig = config.delete;

//     del(delConfig.src, callback);
// });

// /* = Delete / clean build folders and files */


// /**
//  *  Lint CSS
//  * =====================================================================
//  */
// // gulp.task('lint:css', function() {
// //     var lintConfig = config.csslint;

// //     return gulp.src(lintConfig.src)
// //         .pipe(g.csslint(lintConfig.options))
// //         .pipe(g.csslint.reporter());
// // });

// /* = Lint CSS */



// /**
//  *  Lint JS
//  * =====================================================================
//  */
// gulp.task('lint:js', function() {
//     var lintConfig = config.jshint;

//     return gulp.src(lintConfig.src)
//         .pipe(g.jshint(lintConfig.options.level))
//         .pipe(g.jshint.reporter(lintConfig.options.reporter));
// });

// /* = Lint JS */


// /**
//  *  Watch task - start browser-sync and watch for file changes
//  * =====================================================================
//  */
// gulp.task('watch', ['browsersync'], function() {
//     var wc = config.watch;

//     gulp.watch(wc.templates, ['reload:templates']);
//     gulp.watch(wc.sass, ['build:css']);
//     gulp.watch(wc.scripts, ['lint:js', 'build:js']);
//     gulp.watch(wc.images, ['copy:images']);
//     gulp.watch(wc.svg, ['copy:fonts']);
//     gulp.watch(wc.sprites, ['build:sprites']);
// });

// /* = Watch task */


// /**
//  *  Default task - task run when no task runner params are specified
//  * =====================================================================
//  */
// gulp.task('default', ['watch']);

/* = Default task */
