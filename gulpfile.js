var gulp = require('gulp');

// for multiple tasks
var rename = require('gulp-rename');

// for the minify task
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

// for the jsdoc-generate task
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
var gutil = require('gulp-util');

/* The current directory in this script is the same as the base directory
   of this project, the one that contains the src folder. */

/* This is a list of all the required source files, 
   in the order that they should appear in the concatenated files. */
var sources = [
  // Dependencies
  './src/scripts/vendor/threejs/build/three.js', // Use the whole thing for now
  './src/scripts/vendor/tween.min.js', // TODO: add the new version
  './src/scripts/vendor/CSS3DRenderer.js',
  
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

var projectName = 'ThreeTwist';

var tasks = {
  'minify': function() {
    return gulp.src(sources)
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
