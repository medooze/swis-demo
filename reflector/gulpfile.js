var gulp = require('gulp');
var stylus = require('gulp-stylus');
var nib = require('nib');
var rename = require('gulp-rename');
var touch = require('gulp-touch');
var path = require('path');
var browserify = require('browserify');
var vinyl_source_stream = require('vinyl-source-stream');
var vinyl_buffer = require('vinyl-buffer');
var widgetCompiler = require('jquery-widget-compiler');
var mkdirp = require('mkdirp');
var browserSync = require('browser-sync').create();

const PKG = require('./package.json');

gulp.task('widgets', function(done)
{
	var buildDir = './build';

	mkdirp.sync(buildDir);

	widgetCompiler.directory(
		{
			dir    : './templates',
			output : path.join(buildDir, 'index.js'),
			css    : path.join(buildDir, 'index.css')
		},
		function(error)
		{
			if (!error)
				done();
			else
				done(new Error('widgets compilation failed: ' + error.toString()));
		});
});

gulp.task('css', function()
{
	return gulp.src([ './stylus/index.styl' ])
		.pipe(stylus(
			{
				use      : nib(),
				compress : false  // minifycss does it better.
			}))
		.pipe(rename(PKG.name + '.css'))
		.pipe(gulp.dest('./dist'))
		.pipe(touch());
});

gulp.task('browserify', function()
{
	return browserify([path.join(__dirname, PKG.main)],
	{
		transform  : [ 'brfs' ],
		standalone : PKG.name
	})
		.bundle()
		.pipe(vinyl_source_stream(PKG.name + '.js'))
		.pipe(vinyl_buffer())
		.pipe(rename(PKG.name + '.js'))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('browser:open', function(done)
{
	browserSync.init(
	{
		server: { baseDir: './' }
	});

	done();
});

gulp.task('browser:reload', function(done)
{
	browserSync.reload();

	done();
});

gulp.task('watch', function()
{
	return gulp.watch(
		[
			'./index.html',
			'./index.js',
			'./lib/**/*.js',
			'./templates/**/*.html',
			'./stylus/**/*.styl',
			'./settings.json'
		],
		gulp.series('build', 'browser:reload'));
});

gulp.task('build', gulp.series('widgets', 'css', 'browserify'));

gulp.task('live', gulp.series('widgets', 'css', 'browserify', 'browser:open', 'watch'));

gulp.task('default', gulp.series('build'));
