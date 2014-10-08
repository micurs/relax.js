var gulp = require('gulp');
var uglify = require('gulp-uglify');
var print = require('gulp-print');
var tsc  = require('gulp-tsc');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');

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

gulp.task('relaxjs', function() {
  return gulp.src( [ './relaxjs/src/*.ts' ] )
          .pipe( print(function(filepath) { return "relaxjs file: " + filepath; } ) )
          .pipe( tsc( {  module: 'commonjs',
                         target: 'ES5',
                         declaration: true,
                         sourcemap: false,
                         emitError: false,
                         outDir: './relaxjs/bin/' } ) )
          .pipe(gulp.dest('./relaxjs/bin'))
          .pipe( print(function(filepath) { return "Compiled to: " + filepath; } ) )
          .on('error', onError );
});

gulp.task('ts_server', function() {
  return gulp.src( [ 'site/src/*.ts' ] )
          .pipe( print(function(filepath) { return "TS server file: " + filepath; } ) )
          .pipe( tsc( {  module: 'commonjs',
                         target: 'ES5',
                         sourcemap: false,
                         emitError: false,
                         outDir: 'site/bin/' } ) )
          .pipe(gulp.dest('site/bin'))
          .pipe( print(function(filepath) { return "Compiled to: " + filepath; } ) )
          .on('error', onError );
});

gulp.task('ts_client', function() {
  return gulp.src( [ 'site/public/**/*.ts' ] )
          .pipe( print( function(filepath) { return "TS client file: " + filepath; } ) )
          .pipe( tsc( {  module: 'amd', target: 'ES5', sourcemap: true, emitError: false } ) )
          .pipe(gulp.dest('site/public/javascript'))
          .pipe( print(function(filepath) { return "Compiled to: " + filepath; } ) );
});

gulp.task('styles', function() {
    gulp.src(['site/public/stylesheets/*.less'], { base: 'site/public/stylesheets/' })
        .pipe(sourcemaps.init())
          .pipe( less({ relativeUrls : true }).on('error', console.error) )
        .pipe(sourcemaps.write('.', { sourceRoot: 'site/public/stylesheets/' } ))
        // .pipe(minifyCSS())
        .pipe(gulp.dest('site/public/stylesheets'));
});

gulp.task('lint', function() {
  return gulp.src('./bin/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});


gulp.task( 'watch', function() {
  fatalLevel = fatalLevel || 'off';
  gulp.watch( [ './relaxjs/src/*.ts' ], ['relaxjs'] )
  gulp.watch( [ './site/src/*.ts' ] ,  ['ts_server'] );
  gulp.watch( [ './site/public/**/*.ts' ] ,  ['ts_client'] );
  gulp.watch( [ './site/public/stylesheets/*.less' ] ,  ['styles'] );
  //gulp.watch( [ './bin/**/*.js' ] ,  ['lint'] );
});

// Default Task
gulp.task( 'default', [ 'ts_server','ts_client', 'styles', 'lint' ] );
