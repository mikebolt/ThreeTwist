var gulp = require('gulp');

// for multiple tasks
var rename = require('gulp-rename');
var gutil = require('gulp-util');

// for the minify task
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

// for the jsdoc-generate task
//var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');

// for the jshint task
//var jshint = require('gulp-jshint');

// for the source-metrics task
//var sloc = require('gulp-sloc');

// for the test task
//var mocha = require('gulp-mocha');

// for the validate task
//var jsValidate = require('gulp-jsvalidate');

// for the list-functions task
//var JSONEditor = require('gulp-json-editor');
//var esprima = require('gulp-esprima');

/* The current directory in this script is the same as the base directory
   of this project, the one that contains the src folder. */

/* This is a list of dependencies to be included in the concatenated files,
   in order, before the project sources. */
var dependencies = [
  './src/scripts/vendor/threejs/build/threejs_custom.js', // Use the whole thing for now
  './src/scripts/vendor/tween.min.js', // TODO: add the new version
  
  // alg.js stuff
  './src/scripts/vendor/alg/alg_jison.js',
  './src/scripts/vendor/alg/alg.js'
  
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
  './src/scripts/interaction.js',
  './src/scripts/projector.js',
  './src/scripts/queues.js',
  './src/scripts/renderer.js',
  './src/scripts/solvers.js',
  './src/scripts/selector.js',
  './src/scripts/cubes.js', // cube.js needs to appear after groups.js
];

var allSources = dependencies.concat(sources);

var tests = './tests/*.js'; // For now all the tests just sit in the tests directory.

var projectName = 'ThreeTwist';

gulp.add('concat', function() {
  return gulp.src(allSources)
    .pipe(concat(projectName + '.js'))
    .pipe(gulp.dest('./build'));
});

gulp.task('validate', function() {
  return gulp.src(sources)
    .pipe(jsValidate());
});

gulp.task('source-metrics', function() {
  return gulp.src(sources)
    .pipe(sloc());
});

gulp.task('jshint', function() {
  return gulp.src(sources)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});
