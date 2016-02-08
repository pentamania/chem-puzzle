const gulp = require('gulp');
// var typescript = require('gulp-typescript');
var concat = require('gulp-concat');
var babel = require("gulp-babel");
const replace = require("gulp-replace");

gulp.task('babel', function() {
  return gulp.src('./src/es6/**/*.es6')
    .pipe(babel({
		presets: ['es2015'],
        // sourceMaps: "both"
	}))
    .pipe(replace("\"use strict\";", ""))
    // .pipe(replace("\'use strict\';", ""))
	.pipe(concat('game.js'))
    .pipe(gulp.dest('./build/'))
});

gulp.task('html', ()=> {
  return gulp.src('./src/*.html')
    // .pipe(concat('game.js'))
    .pipe(gulp.dest('./build/'))
});

// gulp.task('ts-compile', function(){
  // 対象となるファイルを全部指定
  // gulp.src(['./src/ts/**/*.ts'])
    // .pipe(typescript({ target: "ES5", removeComments: true, sortOutput: true }))
    // jsプロパティを参照
    // .js
    // .pipe(gulp.dest('../build/js/'));
// });

gulp.task('watch', [], ()=>{
	return  gulp.watch('./src/**/*.*', ['babel']);
});

gulp.task('build', ['html', 'babel'], ()=>{
	return  console.log('building...');
});

gulp.task('default', ['build','watch'], ()=>{
	return gulp.src('./src/*.html')
    .pipe(gulp.dest('./build/'))
});

gulp.task('test', ()=>{
	return console.log("test");
});
