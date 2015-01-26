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
    _               = require('lodash'),
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

    // make some noise
    $.util.beep();

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
var gulpConfig = require(process.cwd() + '/config.js');

$.util.log(gulpConfig);

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
    var config = gulpConfig.csslint;

    return gulp.src(config.src)
        .pipe($.cached('csslint'))
        .pipe($.csslint(config.options));
});

/**
 * Lint JavaScript
 * =====================================================================
 */
gulp.task('jshint', function () {
    var config = gulpConfig.jshint;

    return gulp.src(config.src)
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
    var config = gulpConfig.images;

    return gulp.src(config.src)
        // we use gulp-changed instead of gulp-cached because
        // we don't want to keep large binary data in memory
        // gulp-changed checks file timestamps, and is much more
        // efficient than gulp-cached when handling binary data
        .pipe($.changed(config.dest))
        .pipe(gulp.dest(config.dest));
});

/**
 * Base64 smaller image assets referenced in stylesheets
 * =====================================================================
 */
gulp.task('base64', ['styles'], function() {
    var config = gulpConfig.base64;

    return gulp.src(config.src)
        .pipe($.base64(config.options))
        .pipe(gulp.dest(config.dest));
});

/**
 * Copy fonts to build folder
 * =====================================================================
 */
gulp.task('fonts', function () {
    var config = gulpConfig.fonts;

    return gulp.src(config.src)
        .pipe(gulp.dest(config.dest));
});


/**
 * Sass compilation + Autoprefixer + Minification
 *
 * [1] - expanded and compact are not supported in libass
 * =====================================================================
 */
gulp.task('styles', function () {
    var config = gulpConfig.sass;

    //config.options.onError = browserSync.notify;

    browserSync.notify('Compiling Sass');
    // make this more-specific; exclude partials from source
    return gulp.src(config.src)
        //.pipe($.plumber())
        .pipe($.sourcemaps.init())
        // pipe the changed files through sass transformer
        .pipe($.sass(config.options))
        .on('error', handleErrors)
        // autoprefix resulting css
        .pipe($.autoprefixer(gulpConfig.autoprefixer))
        .pipe($.sourcemaps.write('./', {includeContent: false}))
        // create/write the resulting stylesheet css file
        .pipe(gulp.dest(config.dest));
});


/* = Sass compilation + Autoprefixer + Minification */


/**
 *  JavaScript processing with Browserify
 * =====================================================================
 */

gulp.task('scripts', function(callback) {

    var config = gulpConfig.browserify;

    browserSync.notify('Compiling JavaScript', 1000);

    var bundleQueue = config.bundleConfigs.length;

    var browserifyThis = function( bundleConfig ) {

        if (watch) {
            _.extend(bundleConfig, watchify.args, { debug: true,
                extensions: config.extensions
            });

            bundleConfig = _.omit(bundleConfig, ['external', 'require']);
        }

        var bundler = browserify(bundleConfig);

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
                .on('end', reportFinished)
                .pipe(browserSync.reload({stream:true}));
        };

        if (watch) {
            // wrap with watchify and re-bundle
            bundler = watchify(bundler);
            // re-bundle after updates
            bundler.on('update', bundle);
            // log informational message to console indicating that
            // watchify is enabled
            bundleLogger.watch(bundleConfig.outputName);
        } else {
            // handle shared dependencies
            // bundler.require exposes modules externally
            if( bundleConfig.require ) {
                $.util.log("require", bundleConfig.require);
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
    config.bundleConfigs.forEach(browserifyThis);
});

/* = JavaScript processing with Browserify */


/**
 * Find all useref-tagged includes in html and copy over to dist folder
 * =====================================================================
 */
gulp.task('templates', function () {
    var config = gulpConfig.templates;

    return gulp.src(config.src)
        .pipe($.cached('templates'))
        .pipe(gulp.dest(config.dest));
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
    var config = gulpConfig.clean;

    del(config.src, callback);
});


/**
 *  Watch files for changes / reload BrowserSync
 * =====================================================================
 */
gulp.task('browsersync', ['build'], function() {
    var config = gulpConfig.browsersync;

    browserSync(config);
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
    var config = gulpConfig.optimize.css;

    return gulp.src(config.src)
        .pipe($.minifyCss(config.options))
        .pipe(gulp.dest(config.dest))
        .pipe($.size());
});

gulp.task('optimize:js', function() {
    var config = gulpConfig.optimize.js;

    return gulp.src(config.src)
        .pipe($.uglify(config.options))
        .pipe(gulp.dest(config.dest))
        .pipe($.size());
});

gulp.task('optimize:images', function() {
    var config = gulpConfig.optimize.images;

    return gulp.src(config.src)
        .pipe($.imagemin(config.options))
        .pipe(gulp.dest(config.dest))
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
 * Just like Build, but with optimization tasks as well
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
    var config = gulpConfig.watch;

    gulp.watch(config.templates, ['templates']);
    gulp.watch(config.sass, ['styles', 'csslint']);
    gulp.watch(config.scripts, ['scripts', 'jshint']);
    gulp.watch(config.images, ['images']);
    gulp.watch(config.sprites, ['sprites']);
});

// Default task
gulp.task('default', ['build']);
