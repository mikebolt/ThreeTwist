var gulp = require('gulp');

// for multiple tasks
var rename = require('gulp-rename');
var gutil = require('gulp-util');

// for the minify task
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

// for the jsdoc-generate task
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');

// for the jslint task
var jslint = require('gulp-jslint');

// for the jshint task
var jshint = require('gulp-jshint');

// for the source-metrics task
var sloc = require('gulp-sloc');

/* The current directory in this script is the same as the base directory
   of this project, the one that contains the src folder. */

/* This is a list of dependencies to be included in the concatenated files,
   in order, before the project sources. */
var dependencies = [
  './src/scripts/vendor/threejs/build/three.js', // Use the whole thing for now
  './src/scripts/vendor/tween.min.js', // TODO: add the new version
  './src/scripts/vendor/CSS3DRenderer.js'
];
   
/* This is a list of all the required source files, 
   in the order that they should appear in the concatenated files. */
var sources = [
  // Utils
  './src/scripts/utils/utils.js',
  './src/scripts/main.js',
  './src/scripts/utils/Array.js',
  './src/scripts/utils/Number.js',
  './src/scripts/utils/String.js',
  
  // Main stuff
  './src/scripts/colors.js',
  './src/scripts/controls.js',
  './src/scripts/cubelets.js',
  './src/scripts/directions.js',
  './src/scripts/folds.js',
  './src/scripts/groups.js',
  './src/scripts/interaction.js',
  './src/scripts/projector.js',
  './src/scripts/queues.js',
  './src/scripts/renderer.js',
  './src/scripts/slices.js',
  './src/scripts/solvers.js',
  './src/scripts/twists.js',
  './src/scripts/cubes.js', // cube.js needs to appear after groups.js
  
  // Extras
  // Just include everything for now
  './src/scripts/extras/controls/locked.js',
  './src/scripts/extras/renderers/iecss3d.js',
  './src/scripts/extras/renderers/ierenderer.js',
  './src/scripts/extras/deviceMotion.js',
  './src/scripts/extras/inspect.js'
];

var allSources = dependencies.concat(sources);

var projectName = 'ThreeTwist';

// It's important not to modify any of the original source files in any of these tasks.
var tasks = {
  'copy-stylesheets': function() {
    return gulp.src('./src/styles/*.css')
      .pipe(gulp.dest('./build/styles'));
  },
  
  'minify': function() {
    return gulp.src(allSources)
      .pipe(concat(projectName + '.js'))
      .pipe(gulp.dest('./build'))
      .pipe(rename(projectName + '.min.js'))
      .pipe(uglify())
      .pipe(gulp.dest('./build'));
  },
  
  'jsdoc-generate': function() {
    return gulp.src(sources)
      .pipe(gulpJsdoc2md())
      .on('error', function(err) {
        gutil.log(gutil.colors.red('jsdoc2md failed'), err.message);
      })
      .pipe(rename(function(path) {
        path.extname = '.md';
      }))
      .pipe(gulp.dest('./docs'));
  },
  
  'jslint': function() {
    return gulp.src(sources)
      .pipe(jslint({
          vars: true, // Someday I would like to set this to false.
          nomen: true, // _ok_lol_
          browser: true,
          maxlen: 100, // I think this is a good line length limit.
          'this': true, // We can handle the 'this' keyword.
          predef: ['window', 'console', 'self', 'ThreeTwist'], // Set global declarations for jslint here.
          errorsOnly: false
      }))
      .on('error', function (error) {
          gutil.log(gutil.colors.red('JSLint is mad about something.'), String(error));
          console.error(String(error));
      });
  },
  
  'jshint': function() {
    return gulp.src(sources)
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'));
  },
  
  'source-metrics': function() {
    return gulp.src(sources)
      .pipe(sloc());
  }
};

var taskNames = Object.getOwnPropertyNames(tasks);

// Register all the tasks with gulp
taskNames.forEach(function(taskName) {
  gulp.task(taskName, tasks[taskName]);
});

/* Register the default task with gulp.
   The default task just runs all the other tasks, in no particular order. */
gulp.task('default', taskNames);
