# gulp + browserify starter

Includes example tasks for:

* Browserify (with shim)
* Watchify (caching for faster browserify builds)
* Sass (using libsass + autoprefixer)
* BrowserSync for static server + live reloading
* Image Optimization
* Non-CommonJS shimming (e.g., jQuery Plugin)
* Multiple bundles with shared dependencies
* Error handling (optional Notification Center for MacOS)


## Installing dependencies

Clone this repo, then navigate to the repo directory. From the directory, run the following in your console:

```
npm install
```

This command will examine the dependencies listed in the package.json file, and download them into a ```node_modules``` folder in your project directory.


## Using the ```gulp``` command

If you have gulp installed globally (e.g., you've already installed gulp with ```npm install -g gulp```), then you can run the gulp command(s) from the command line using ```gulp```.

If you don't have gulp installed globally, rather than install it globally, you can use the gulp module that was installed when you ran ```npm install``` as mentioned above. **But**, in order to use the local gulp package, you must type the following at the command line:

**MacOS**
```
./node_modules/.bin/gulp
```
**Windows**
```
node_modules\\bin\\gulp
```

If you like the idea of always relying on a local version of gulp, rather than a globally installed gulp module, you can edit your ```~/.bashrc``` file, adding an alias for gulp that points to a relative path for the gulp module. For example:

**MacOS
```
alias gulp='node_modules/.bin/gulp'
```

**Windows
```
alias gulp='node_modules\\.bin\\gulp'
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