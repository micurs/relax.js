var gulp = require('gulp');
var watch = require('gulp-watch');
var uglify = require('gulp-uglify');
var print = require('gulp-print');
var tsc  = require('gulp-typescript-compiler');



gulp.task('typescript', function() {
  return gulp.src( [ '*.ts', '**/*.ts' ] )
             .pipe( print() )
             .pipe( tsc( {  module: 'amd', target: 'ES5', sourcemap: false, logErrors: true } ) )
             .pipe( print() )
             .pipe(uglify());
});


// Default Task
gulp.task('default', ['typescript']);
