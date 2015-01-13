'use strict';

var argv            = require('yargs');
var gulp            = require('gulp');
var gutil           = require('gulp-util');
var gulpif          = require('gulp-if');
var notify          = require('gulp-notify');

// BrowserSync
var browserSync     = require('browser-sync');

// Vinyl
var buffer          = require('vinyl-buffer');
var source          = require('vinyl-source-stream');

// Sass
var sass            = require('gulp-sass');
var postcss         = require('gulp-postcss');
var autoprefixer    = require('autoprefixer-core');
var mqpacker        = require('css-mqpacker');
var csswring        = require('csswring');
var sourcemaps      = require('gulp-sourcemaps');

// JavaScript
var browserify      = require('browserify');
var jshint          = require('gulp-jshint');
var stylish         = require('jshint-stylish');
var uglify          = require('gulp-uglify');
var watchify        = require('watchify');

// Images
var imagemin        = require('gulp-imagemin');

// Testing
// var mocha        = require('gulp-mocha');


// ------------------------
// Global Task Variables
// ------------------------
var _src = './src'; // source files dir
var _dest = './build'; // build files destination dir

// ------------------------
// Build-related Variables
// ------------------------
// Handle production build flag (e.g., gulp build --production)
var production = !!argv.production; // coerce arg input to bool

// bypass browser-sync / watchify if we are doing a production build
var isBuild = argv._.length ? argv._[0] === 'build' : false;
var shouldWatch = argv._.length ? argv._[0] === 'watch' : false;

// ------------------------
// Task Configuration Object
// ------------------------
var config = {

    // ------------------------
    // Browser Sync
    // ------------------------
    browserSync: {
        server: {
            // Start a simple web server pointed at the build folder
            baseDir: _dest
        }
    },

    // ------------------------
    // HTML Templates
    // ------------------------
    templates: {
        src: _src + '/templates/**',
        dest: _dest + '/templates'
    },

    // ------------------------
    // JS Linting
    // ------------------------
    lint: {
        src: _src + '/js/**/*.js',
        rules: './.jshintrc',
        reporter: 'jshint-stylish'
    },

    // ------------------------
    // Sass
    // ------------------------
    sass: {
        src: _src + '/sass/*.{sass,scss}',
        dest: _dest + '/css',
        outputStyle: 'nested',
        processors: [
            autoprefixer({browsers: ['last 2 version']}),
            mqpacker,
            csswring
        ],
        sourceMapDest: '.'
    },

    // ------------------------
    // Images
    // ------------------------
    images: {
        src: _src + '/images/**',
        dest: _dest + '/images'
    },

    // ------------------------
    // Browserify
    // ------------------------
    browserify: {
        // generate multiple bundles, such as
        // a global bundle that contains app-
        // wide JavaScript code, and a page-
        // specific bundle that has
        // dependencies on modules imported
        // by the global bundle
        bundleConfigs: [
            {
                entries: _src + '/js/global.src.js',
                dest: _dest + '/js',
                outputName: 'global.js',
                extensions: ['.coffee'],
                // modules used by the global
                // module, that you also want
                // available to other modules
                // and therefore do not want
                // to also include (i.e.,
                // duplicate) in another bundle
                require: ['jquery','lodash']
            },
            {
                entries: _src + '/js/my-page.src.js',
                dest: _dest + '/js',
                outputName: 'my-page.js',
                // list of external modules used
                // in this bundle, but that you
                // do not want to include in this
                // bundle
                external: ['jquery','lodash']
            }
        ]
    },

    production: {
        cssSrc: _dest + '/*.css',
        jsSrc: _dest + '/*.js',
        dest: _dest
    }
};

// ------------------------
// Error Notifications
// ------------------------


// ------------------------
// Custom Task Definitions
// ------------------------
var tasks = {

    // ------------------------
    // Delete build folder contents
    // ------------------------
    clean: function(callback) {
        del([dest], callback);
    },

    // ------------------------
    // Copy HTML templates
    // ------------------------
    templates: function() {
        var config = config.templates;

        return gulp.src(config.src)
            .pipe(gulp.dest(config.dest))
            .pipe(browserSync.reload({ stream: true}));
    },

    // ------------------------
    // JS Linting
    // ------------------------
    lint: function() {
        var config = config.lint;

        return gulp.src(config.src)
            .pipe(jshint(config.rules))
            .pipe(jshint.reporter(config.reporter))
            .pipe(jshint.reporter('fail'));
    },

    // ------------------------
    // Sass (uses libsass)
    // ------------------------
    sass: function() {
        var config = config.sass;

        return gulp.src(config.src)
            .pipe(gulpif(!production, sourcemaps.init()))
            .pipe(sass({
                sourceComments: !production,
                outputStyle: config.outputStyle
            }))
            .on('error', handleError('Sass'))
            // generate maps
            .pipe(gulpif(!production, sourcemap.write({
                'includeContent': false,
                'sourceRoot': config.sourceMapDest
            })))
            // run it through autoprefixer
            .pipe(gulpif(!production, sourcemaps.init({
                'loadMaps': true
            })))
            .pipe(postcss(config.processors))
            // source files not served so include scss content inside sourcemaps
            .pipe(sourcemaps.write({
                'includeContent': true
            }))
            // write the external sourcemap files to a directory
            .pipe(gulp.dest(config.dest))
    },

    // ------------------------
    // Browserify
    // ------------------------
    browserify: function() {

    },

    // ------------------------
    // Image Optimization
    // ------------------------
    optimize: function() {
        var config = config.images;

        return gulp.src(config.src)
            .pipe(imagemin({
                // jpeg optimization
                progressive: true,
                // svg optimization
                svgoPlugins: [{ removeViewBox: false }],
                // png optimization
                optimizationLevel: production ? 3 : 1
            }))
            .pipe(gulp.dest(config.dest));
    },

    test: function() {
        var config = config.testing;

        return gulp.src(config.src, { read: false})
            .pipe(mocha({
                'ui': 'bdd',
                'reporter': 'spec'
            })
        );
    }
};

// ------------------------
// BrowserSync
// ------------------------
gulp.task('browser-sync', function() {
    browserSync(config.browserSync);
});

// ------------------------
// BrowserSync Reload Tasks
// ------------------------
gulp.task('reload-sass', ['sass'], function() {
    browserSync.reload({stream: true});
});

gulp.task('reload-js', ['browserify'], function() {
    browserSync.reload({stream: true});
});

gulp.task('reload-templates', ['templates'], function() {
    browserSync.reload({stream: true});
});

// ------------------------
// Custom Tasks
// ------------------------
var req = build ? ['clean'] : [];

gulp.task('clean', tasks.clean);
gulp.task('templates', req, tasks.templates);
gulp.task('assets', req, tasks.assets);
gulp.task('sass', req, tasks.sass);
gulp.task('browserify', req, tasks.browserify);
gulp.task('lint', tasks.lint);
gulp.task('optimize', tasks.optimize);
gulp.task('test', tasks.test);


// ------------------------
// Development Watch Task
// ------------------------
gulp.task('watch', ['templates', 'sass', 'browserify', 'browser-sync'], function() {

    // Sass
    gulp.watch(config.sass.src, ['reload-sass']);

    // JS
    gulp.watch(config.js.src, ['lint', 'reload-js']);

    // Templates
    gulp.watch(config.templates.src, ['reload-templates']);

    // Log to console that we are now watching for changes
    gutil.log(gutil.colors.bgGreen("Now watching for changes..."));
});

// ------------------------
// Build Task
// ------------------------
gulp.task('build', [
    'clean',
    'templates',
    'assets',
    'sass',
    'browserify'
]);

// ------------------------
// Default Task
// ------------------------
gulp.task('default', ['watch']);
