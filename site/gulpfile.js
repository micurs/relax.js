var gulp = require('gulp');
var watch = require('gulp-watch');
var uglify = require('gulp-uglify');
var print = require('gulp-print');
var tsc  = require('gulp-typescript-compiler');


gulp.task('ts_server', function() {
  return gulp.src( [ '*.ts', '**/*.ts', '!./public/**/*.ts', '!./node_modules/**/*.ts' ] )
             .pipe( print() )
             .pipe( tsc( {  module: 'amd', target: 'ES5', sourcemap: false, logErrors: true } ) )
             .pipe(uglify());
});

gulp.task('ts_client', function() {
  return gulp.src( [ './public/**/*.ts' ] )
             .pipe( print() )
             .pipe( tsc( {  module: 'amd', target: 'ES5', sourcemap: false, logErrors: true } ) )
             .pipe(uglify());
});


// Default Task
gulp.task( 'default', ['ts_server','ts_client'] );
