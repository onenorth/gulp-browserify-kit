/**
 * + Project Build Config
 * =====================================================================
 */

var src                  = 'app',
    build                = 'dist',
    development          = build,
    production           = build + '/production',
    srcAssets            = src + '/assets',
    developmentAssets    = development + '/assets',
    productionAssets     = production + '/assets';

module.exports = (function(config) {

    config.browsersync = {
        logPrefix: 'KIT',
        server: {
            // Start a simple web server pointed at the build and src folders
            // src folder is included because of sass source maps - sourcemaps will be created in the app/assets/sass folder when sass files are processed
            baseDir: [build, src]
        },
        //proxy: 'mywebsite.dev',
        port: process.env.PORT || 9999,
        files: [
            developmentAssets + '/styles/*.css',
            developmentAssets + '/js/**/*.js',
            developmentAssets + '/images/**',
            developmentAssets + '/fonts/**',
            development + '/data/**/*.json'
        ],
        browser: ["safari"]
    };

    /**
     * Clean
     *
     * [1] - Use globbing pattern to delete everything in the dist folder
     * [2] - Feel free to add additional files/directories here, or exclude
     *       files with the '!' prefix, such as '!dist/assets/fonts'
     */
    config.clean = {
        src: [build]
    };

    config.sass = {
        src:     [srcAssets + '/styles/**/*.{sass,scss}'],
        dest:    developmentAssets + '/styles',
        options: {
            sourcemap: true,
            includePaths: ['node_modules']
        }
    };

    config.templates = {
        src: [
            src + '/layouts/**/*',
            src + '/includes/**/*',
            src + '/*.html'
        ],
        dest: development
    };

    // autoprefixer options
    config.autoprefixer = {
        browsers: [
            'ie >= 8',
            'ie_mob >= 8',
            'ff >= 30',
            'chrome >= 32',
            'safari >= 6',
            'opera >= 23',
            'ios >= 6',
            'android 2.3',
            'android >= 4.3',
            'bb >= 10'
        ],
        cascade: true
    };

    config.browserify = {
        // Additional file extensions to make optional
        extensions: ['.coffee', '.hbs'],
        // generate a bundle for each bundle config listed below
        // for example, here we are creating a global.js bundle
        // and a my-page.js bundle
        // perhaps I'll add pulling the bundleConfigs from a separate file later
        bundleConfigs: [{
            entries:    './' + srcAssets + '/js/global.js',
            dest:       developmentAssets + '/js',
            outputName: 'global.js',
            paths: ['./node_modules'],
            // modules used by the global
            // module, that you also want
            // available to other modules
            // and therefore do not want
            // to also include (i.e.,
            // duplicate) in another bundle
            // see https://github.com/substack/node-browserify#brequirefile-opts
            require:    ['jquery', 'backbone/node_modules/underscore']
        }, {
            entries:    './' + srcAssets + '/js/home-page.js',
            dest:       developmentAssets + '/js',
            outputName: 'home-page.js',
            // list of external modules used
            // in this bundle, but that you
            // do not want to include in this
            // bundle
            external:   ['jquery','underscore']
        }]
    };

    config.images = {
        src:     srcAssets + '/images/**/*.{gif,jpg,jpeg,png,tiff}',
        dest:    developmentAssets + '/images'
    };

    config.webp = {
        src:     productionAssets + '/images/**/*.{jpg,jpeg,png}',
        dest:    productionAssets + '/images',
        options: {}
    };

    config.gzip = {
        src:     production + '/**/*.{}',
        dest:    production,
        options: {}
    };

    config.fonts = {
        src:  srcAssets + '/fonts/**',
        dest: developmentAssets + '/fonts'
    };

    config.base64 = {
        src:     developmentAssets + '/styles/*.css',
        dest:    developmentAssets + '/styles',
        options: {
            baseDir:      build,
            extensions:   ['png'],
            maxImageSize: 20 * 1024, // bytes
            debug: false
        }
    };

    config.watch = {
        templates: [
            src + '/data/**/*.{json,yml,csv}',
            src + '/layouts/**/*.html',
            src + '/includes/**/*.{html,tmpl,xml}',
            src + '/**/*.html',
            src + '/*'
        ],
        sass:       srcAssets + '/styles/**/*.{sass,scss}',
        scripts:    srcAssets + '/js/*/*.js',
        images:     srcAssets + '/images/**/*',
        sprites:    srcAssets + '/images/**/*.png',
        svg:        'vectors/*.svg'
    };

    // csslint options
    // https://github.com/CSSLint/csslint/wiki/Rules-by-ID
    // we have to use the developmentAssets path because we are linting the
    // already-compiled css file (i.e., already piped through sass)
    // This could change if we could use a node-based sass linter,
    // but it is what it is for now
    config.csslint = {
        src: developmentAssets + '/css/*.css',
        options: {
            'box-sizing': false,
            'universal-selector': false,
            'compatible-vendor-prefixes': false
        }
    };

    config.jshint = {
        src: srcAssets + '/js/**/*.js',
        options: {
            level: 'error',
            reporter: 'jshint-stylish'
        }
    };

    config.sprites = {
        src: srcAssets + '/images/sprites/icon/*.png',
        dest: {
            css: srcAssets + '/stylesq/base',
            image: srcAssets + '/images/sprites/'
        },
        options: {
            cssName: '_sprites.scss',
            cssFormat: 'css',
            cssOpts: {
                cssClass: function (item) {
                    // if we have a hover sprite, name it as a hover sprite
                    // e.g., 'home-hover' => 'home:hover'
                    if (item.name.indexOf('-hover') !== 1) {
                        return '.icon-' + item.name.replace('-hover', ':hover');
                        // otherwise use the name as the selector
                    } else {
                        return '.icon-' + item.name;
                    }
                }
            },
            imgName: 'icon-sprite.png',
            imgPath: '/assets/images/sprites/icon-sprite.png'
        }
    };

    // Tasks used for production builds
    config.optimize = {
        // CSS Optimization
        css: {
            src:     developmentAssets + '/styles/*.css',
            dest:    productionAssets + '/styles/',
            options: {
                keepSpecialComments: 0
            }
        },
        // JavaScript Optimization
        js: {
            src:     developmentAssets + '/js/**/*.js',
            dest:    productionAssets + '/js/',
            options: {}
        },
        // Image Optimization
        images: {
            src:     developmentAssets + '/images/**/*.{jpg,jpeg,png,gif}',
            dest:    productionAssets + '/images/',
            options: {
                optimizationLevel: 3,
                progressive:       true,
                interlaced:        true
            }
        },
        // HTML Optimization
        html: {
            src:     production + '/**/*.html',
            dest:    production,
            options: {
                collapseWhitespace: true
            }
        }
    };

    config.revision = {
        src: {
            assets: [
                productionAssets + '/css/*.css',
                productionAssets + '/js/**/*.js',
                productionAssets + '/images/**/*'
            ],
            base: production
        },
        dest: {
            assets: production,
            manifest: {
                name: 'manifest.json',
                path: productionAssets
            }
        }
    };

    config.collect = {
        src: [
            productionAssets + '/manifest.json',
            production + '/**/*.{html,xml,txt,json,css,js}',
            '!' + production + '/feed.xml'
        ],
        dest: production
    };

    config.rsync = {
        src: production + '/**',
        options: {
            destination: '~/some/path/on/remote/server',
            root: production,
            hostname: 'yourdomain.com',
            username: 'youruser',
            incremental: true,
            progress: true,
            relative: true,
            emptyDirectories: true,
            recursive: true,
            clean: true,
            exclude: ['.DS_Store', 'Thumbs.db'],
            include: []
        }
    };

    // js testing options
    config.mocha = {
        'ui': 'bdd',
        'reporter': 'spec'
    };

    // config sync options
    // https://github.com/danlevan/gulp-config-sync
    config.configSync = {
        fields: [
            'name',
            'version',
            'description',
            'keywords',
            'version',
            'private'
        ],
        space: 2
    };

    return config;
})({});

/* = Project Build Config */
