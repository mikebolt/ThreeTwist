var gulp = require('gulp');
var treegulp = require('treegulp');

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

// for the jscs task
//var jscs = require('gulp-jscs');

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

var tests = './tests/*.js'; // For now all the tests just sit in the tests directory.

var projectName = 'ThreeTwist';

gulp.task('concat', function() {
  return gulp.src(allSources)
    .pipe(concat(projectName + '.js'))
    .pipe(gulp.dest('./build'));
});

// It's important not to modify any of the original source files in any of these tasks.
/*
treegulp('default',
  treegulp('copy-stylesheets', function() {
    return gulp.src('./src/styles/*.css')
      .pipe(gulp.dest('./build/styles'));
  }),
  treegulp('minify',
    treegulp('concat', function() {
      return gulp.src(allSources)
        .pipe(concat(projectName + '.js'))
        .pipe(gulp.dest('./build'));
    }),
    function() {
      return gulp.src('./build/' + projectName + '.js')
        .pipe(uglify())
        .pipe(rename(projectName + '.min.js'))
        .pipe(gulp.dest('./build'));
    }),
  treegulp('jsdoc-generate', function() {
    gulp.src(sources)
      .pipe(gulpJsdoc2md())
      .on('error', function(err) {
        gutil.log(gutil.colors.red('jsdoc2md failed'), err.message);
      })
      .pipe(rename(function(path) {
        path.extname = '.md';
      }))
      .pipe(gulp.dest('./docs'));
  }),
  treegulp('jshint', function() {
    return gulp.src(sources)
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'));
  }),
  treegulp('checkstyle', function() {
    return gulp.src(sources)
      .pipe(jscs({configPath: './.jscsrc'}));
  }),
  treegulp('source-metrics', function() {
    return gulp.src(sources)
      .pipe(sloc());
  }),
  treegulp('test', function() {
    return gulp.src(tests)
      .pipe(mocha({
        ui: 'bdd',
        reporter: 'spec',
        timeout: '15000', // 15 seconds
        bail: 'false',
      }));
  }),
  treegulp('validate', function() {
    return gulp.src(sources)
      .pipe(jsValidate());
  }),
  treegulp('list-functions', function() {
    return gulp.src(sources)
      .pipe(esprima())
      
      // Return a list of functions in the AST.
      // A function is an object that has a "type" property of either
      // "FunctionExpression" or "FunctionDeclaration".
      // TODO: if anonymous function is directly assigned, return the name
      // of the identifier it it assigned to.
      .pipe(JSONEditor(function listFunctions(json) {
        var findings = [];
        
        if (Array.isArray(json)) {
          // If it's an array, search through each element.
          for (var i = 0; i < json.length; ++i) {
            findings = findings.concat(listFunctions(json[i]));
          }
        }
        else if (typeof json === 'object' && json !== null) {
          // Check if the current object is a function.
          // If so, add it to the findings list.
          console.log('The type is an object');
          if (json.type === 'FunctionExpression' ||
              json.type === 'FunctionDeclaration') {
            if (json.id === null) {
              findings.push(null);
            }
            else if (typeof json.id === 'object' &&
                     json.id.type === 'Identifier') {
              findings.push(json.id.name);
            }
          }
          
          // Recurse on anything that might have a function in it.
          var keys = Object.keys(json);
          console.log("keys is...", keys);
          for (var i = 0; i < keys.length; ++i) {
            findings = findings.concat(listFunctions(json[keys[i]]));
          }
        }
        
        return findings;
      }))
      .pipe(gulp.dest('functions'));
  })
);
*/
