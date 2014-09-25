var gulp = require('gulp');
var watch = require('gulp-watch');
var uglify = require('gulp-uglify');
var print = require('gulp-print');
var tsc  = require('gulp-tsc');


gulp.task('ts_server', function() {
  return gulp.src( [ '*.ts', '**/*.ts', '!./public/**/*.ts', '!./node_modules/**/*.ts' ] )
          .pipe( print(function(filepath) { return "TSC server side: " + filepath; } ) )
          .pipe( tsc( {  module: 'amd', target: 'ES5', sourcemap: false, emitError: false } ) )
          .pipe(gulp.dest('./'))
          .pipe( print(function(filepath) { return "Result: " + filepath; } ) );
});

gulp.task('ts_client', function() {
  return gulp.src( [ './public/**/*.ts' ] )
          .pipe( print( function(filepath) { return "Tsc client side: " + filepath; } ) )
          .pipe( tsc( {  module: 'amd', target: 'ES5', sourcemap: true, emitError: false } ) )
          .pipe(gulp.dest('./'));
});


// Default Task
gulp.task( 'default', ['ts_server','ts_client'] );
