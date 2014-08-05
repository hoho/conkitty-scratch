'use strict';

var gulp = require('gulp');

var eslint = require('gulp-eslint');
var uglify = require('gulp-uglify');
var conkitty = require('gulp-conkitty');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var filter = require('gulp-filter');
var prefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');

var del = require('del');
var fs = require('fs');
var path = require('path');

var devServe = require('devserve');
var nyanoislands = require('nyanoislands');



var config = (function() {
    var server = JSON.parse(fs.readFileSync('server.json', {encoding: 'utf8'})),
        app = JSON.parse(fs.readFileSync('app.json', {encoding: 'utf8'})),
        dest = path.resolve(app.dest || 'target/www'),
        build = process.env.MAVEN_VERSION || process.env.BUILD_VERSION || '0',
        lib,
        libFiles,
        i,
        libs = [];

    for (lib in app.libs) {
        if ((libFiles = app.libs[lib])) {
            lib = path.dirname(require.resolve(lib));

            if (typeof libFiles === 'string') {
                libFiles = [libFiles];
            }

            for (i = 0; i < libFiles.length; i++) {
                libs.push(path.join(lib, libFiles[i]));
            }
        }
    }

    return {
        title: app.title,
        mode: process.env.MODE || 'development',
        build: build,
        dest: dest,
        static: path.join(dest, '_', build),
        libs: libs,
        server: server
    };
})();


gulp.task('clean', function(cb) {
    del([config.dest], cb);
});


gulp.task('eslint', function() {
    var rules = {
        'quotes': [2, 'single'],
        'no-shadow-restricted-names': 0,
        'no-underscore-dangle': 0,
        'no-use-before-define': [2, 'nofunc']
    };

    gulp.src(['gulpfile.js'])
        .pipe(eslint({rules: rules, env: {node: true}}))
        .pipe(eslint.format());

    gulp.src(['pages/**/*.js', 'blocks/**/*.js', 'routes/**/*.js'])
        .pipe(eslint({rules: rules, env: {browser: true}}))
        .pipe(eslint.format());
});


gulp.task('libs', function() {
    if (config.libs.length) {
        return gulp.src(config.libs)
            .pipe(filter('**/*.js'))
            .pipe(concat('libs.js'))
            .pipe(gulp.dest(config.static));
    }
});


gulp.task('app', function() {
    var cssFilter = filter('**/*.css'),
        jsFilter = filter(['**/*.js', '!tpl.js']);

    return gulp.src(['pages/**/*.ctpl', 'blocks/**/*.ctpl'])
        .pipe(conkitty({
            common: {file: 'common.js', 'concat.js': false},
            templates: 'tpl.js',
            deps: true,
            libs: {nyanoislands: nyanoislands}
        }))
        .pipe(jsFilter)
        .pipe(concat('deps.js'))
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
        .pipe(concat('deps.css'))
        .pipe(prefix('last 1 version', '> 1%'))
        .pipe(cssFilter.restore())
        .pipe(gulp.dest(config.static));
});


gulp.task('routes', function() {
    return gulp.src('routes/routes.js')
        .pipe(gulp.dest(config.static));
});


gulp.task('page', function() {
    return gulp.src(['pages/page.html'])
        .pipe(replace(/%%%TITLE%%%/g, config.title))
        .pipe(replace(/%%%BUILD_VERSION%%%/g, config.build))
        .pipe(gulp.dest(config.dest));
});


gulp.task('build', ['libs', 'app', 'page', 'routes']);


gulp.task('uglify', ['build'], function() {
    if (config.mode === 'prod') {
        gulp.src(config.dest + '/**/*.js')
            .pipe(uglify({preserveComments: 'some'}))
            .pipe(gulp.dest(config.dest));

        gulp.src(config.dest + '/**/*.css')
            .pipe(minifyCSS())
            .pipe(gulp.dest(config.dest));
    }
});


gulp.task('serve', ['build'], function() {
    gulp.watch([
        'blocks/**/*.js',
        'blocks/**/*.css',
        'blocks/**/*.ctpl',
        'pages/**/*.js',
        'pages/**/*.css',
        'pages/**/*.ctpl'
    ], ['app']);
    gulp.watch('pages/page.html', ['page']);
    gulp.watch('routes/routes.js', ['routes']);
    devServe(config.server, config.dest);
});


gulp.task('default', ['eslint', 'build', 'uglify']);
