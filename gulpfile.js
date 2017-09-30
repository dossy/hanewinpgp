'use strict'

const gulp = require('gulp')
const pkg = require('./package.json')

const banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''
].join('\n');

gulp.task('build', function() {
  const files = [
    'src/**/*.js'
  ];

  return gulp.src(files)
    .pipe(require('gulp-concat')('hanewinpgp.js'))
    .pipe(require('gulp-header')(banner, { pkg: pkg }))
    .pipe(gulp.dest('build'))
    .pipe(require('gulp-uglify')())
    .pipe(require('gulp-rename')({ suffix: '-min' }))
    .pipe(require('gulp-header')(banner, { pkg: pkg }))
    .pipe(gulp.dest('build'));
});

gulp.task('watch', function() {
  gulp.watch('src/**/*.js', [ 'build' ]);
});

gulp.task('default', function () {
  gulp.start('build');
});
