var gulp = require('gulp');
var uglify = require('gulp-uglify');
var print = require('gulp-print');
var tsc  = require('gulp-tsc');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var sourcemaps = require('gulp-sourcemaps');
var console = require('better-console');

var ERROR_LEVELS = ['error', 'warning'];

var fatalLevel = require('yargs').argv.fatal;

function isFatal(level) {
  return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error');
}

function handleError(level, error) {
   gutil.log(error.message);
   if (isFatal(level)) {
      process.exit(1);
   }
}

function onError(error) { handleError.call(this, 'error', error);}
function onWarning(error) { handleError.call(this, 'warning', error);}

/*
gulp.task('relaxjs', ['relaxjs_compile'], function() {
  gulp.src( [ './relaxjs/bin/*.js'])
      .pipe( gulp.dest('./node_modules/relaxjs'))
      .pipe( print(function(filepath) { return "Deployed to: " + filepath; } ) );

  gulp.src( [ './relaxjs/bin/relaxjs.d.ts'])
      .pipe( gulp.dest('./typings/relaxjs'))
      .pipe( print(function(filepath) { return "Deployed to: " + filepath; } ) );

  gulp.src( [ './relaxjs/package.json'])
      .pipe( gulp.dest('./node_modules/relaxjs'))
      .pipe( print(function(filepath) { return "Deployed to: " + filepath; } ) );

});
*/

var typescript_options = {
  module: 'commonjs',
  target: 'ES5',
  declaration: false,
  sourcemap: false,
  emitError: false,
  removeComments: true,
  outDir: './dist' };

var sources_to_compile = [ './src/relaxjs.ts',
                           './src/internals.ts',
                           './src/routing.ts' ];
var sources_to_copy = [ './src/relaxjs.d.ts' ];
var dests = [ './dist/*.js' ];

gulp.task('relaxjs_copy', function() {
  return gulp.src( sources_to_copy )
        .pipe(gulp.dest('./dist'));
});

gulp.task('relaxjs_compile', function() {
  console.clear();
  return gulp.src( sources_to_compile )
          .pipe( print(function(filepath) { return "relaxjs file: " + filepath; } ) )
          .pipe( tsc( typescript_options ) )
          .pipe(gulp.dest('./dist'))
          .pipe( print(function(filepath) { return "Compiled to: " + filepath; } ) )
          .on('error', onError );
});


gulp.task('lint', ['relaxjs_compile', 'relaxjs_copy' ], function() {
  return gulp.src(dests)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});


gulp.task( 'watch', function() {
  fatalLevel = fatalLevel || 'off';
  gulp.watch( sources_to_compile ,  ['relaxjs_compile'] );
  gulp.watch( sources_to_copy ,  ['relaxjs_copy'] );
});

// Default Task
gulp.task( 'default', [ 'lint' ] );
