var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('lint', function()
{
	var src = [ './index.js', './lib/**/*.js' ];

	return gulp.src(src)
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(jshint.reporter('fail'));
});

gulp.task('default', gulp.series('lint'));
