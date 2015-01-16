# gulp + browserify starter

Includes example tasks for:

* BrowserSync for static server + live reloading
* Browserify (with shim)
* Multiple browserify bundles with shared dependencies
* Non-CommonJS shimming (jQuery plugin)
* Watchify (caching for faster browserify builds)
* Sass/SCSS (libsass + autoprefixer)
* CSS optimization (mqpacker + csswring)
* Linting of CSS and JavaScript (csslint + jshint)
* Automatic sprite generation (spritesmith)
* Image optimization (imagemin + base64)
* Gulp task error handling (optional Notification Center for MacOS)
* Simple Production deployment (rsync)


## Installing dependencies

Clone this repo, then navigate to the repo directory. From the directory, run the following in your console:

```
npm install
```

This command will examine the dependencies listed in the package.json file, and download them into a ```node_modules``` folder in your project directory.


## Using npm to run gulp tasks
You will use npm to initiate the gulp tasks available in this project. The task
options that are available are listed in the `scripts` section of the package.json file.Currently, the following tasks are available for your use:

* dev (build development a development version of the project, start a web server, open a new browser window and load the app in the browser, watch for file changes and automatically reload the browser page on all connected devices)
* build-dev (build a development version of the project without running a server or watching for file changes)
* build (build a production-ready version of the project, optimizing all relevant files, without running a server or watching for file changes)
* test (start a testing harness and execute all test tasks)

#### `npm run dev`
In order to run the application in development mode, you will use the gulp
development task.

```
> npm run dev
```


## Running ```gulp```

Now that the gulp install is sqaured away, you can run ```gulp``` from the command line to kick things off.

When you run ```gulp``` from the command line, you will automatically execute the ```default``` task described in the ```gulp/tasks/default.js``` file.

The ```default``` task has the following task dependencies:

* Sass
* images
* markup
* watch


### gulp production
There is also a task that illustrates production environment use, which can be run with ```gulp prouction```, which will build an optimized output set of compressed css and js files to a ```build```folder, in addition to display file sizes in the console. The ```production``` task is a shortcut for running the tasks ```['iamges', 'minifyCss', 'uglifyJs'].

## Configuration

All project-specific settings pertaining to gulp are abstracted and managed in a config object defined in the ```gulp\config.js``` file. You should examine this file, and change the settings to match your project requirements.
