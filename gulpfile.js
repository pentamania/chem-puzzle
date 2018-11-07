const gulp = require('gulp');
// const typescript = require('gulp-typescript');
const concat = require('gulp-concat');
const babel = require("gulp-babel");
const replace = require("gulp-replace");

gulp.task('babel', function() {
  return gulp.src('./src/**/*.es6')
    .pipe(babel({
      presets: ['es2015'],
      // sourceMaps: "both"
    }))
    .pipe(replace("\"use strict\";", ""))
    .pipe(concat('game.js'))
    .pipe(gulp.dest('./build/'))
});

gulp.task('html', ()=> {
  return gulp.src('./src/*.html')
    .pipe(gulp.dest('./build/'))
});

gulp.task('watch', [], ()=> {
  return gulp.watch('./src/**/*.*', ['babel']);
});

gulp.task('build', ['html', 'babel'], ()=> {
  return console.log('building...');
});

gulp.task('default', ['build','watch'], ()=> {
  return gulp.src('./src/*.html')
    .pipe(gulp.dest('./build/'))
});
