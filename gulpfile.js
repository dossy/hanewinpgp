'use strict';

var gulp = require('gulp');
var pkg = require('./package.json');

var banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''
].join('\n');

gulp.task('clean', function (cb) {
  return require('del')([
    'dist',
    'docs'
  ]);
});

gulp.task('build', ['docs'], function() {
  var files = [
    'src/**/*.js'
  ];

  return gulp.src(files)
    .pipe(require('gulp-concat')('hanewinpgp.js'))
    .pipe(require('gulp-header')(banner, { pkg: pkg }))
    .pipe(gulp.dest('dist'))
    .pipe(require('gulp-uglify')())
    .pipe(require('gulp-rename')({ suffix: '-min' }))
    .pipe(require('gulp-header')(banner, { pkg: pkg }))
    .pipe(gulp.dest('dist'));
});

gulp.task('docs', function() {
  return gulp.src(['src/**/*.js', 'README.md'])
    .pipe(require('gulp-jsdoc')('docs'));
});

gulp.task('format', function() {
  return gulp.src(['src/**/*.js'])
    .pipe(require('gulp-esformatter')())
    .pipe(gulp.dest('src'));
});

gulp.task('lint', function() {
  var jshint = require('gulp-jshint');
  var stylish = require('jshint-stylish');

  return gulp.src('src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('test', function (cb) {
  gulp.src('test/**/*.js')
    .pipe(require('gulp-nodeunit')())
    .on('end', cb);
});

gulp.task('test-watch', function() {
  return gulp.watch(['src/**/*.js', 'test/**/*.js'], ['test']);
});

gulp.task('watch', function() {
  gulp.watch('src/**/*.js', ['build']);
});

gulp.task('default', ['clean'], function () {
  gulp.start('build');
});
