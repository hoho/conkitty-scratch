'use strict';

var path = require('path');

if (module === require.main) {
    // When you do `node gulpfile.js` in command line.
    require('child_process').spawn(
        path.join(path.dirname(require.resolve('gulp')), 'bin', 'gulp.js'),
        process.argv.slice(2),
        {stdio: 'inherit', env: process.env}
    ).on('close', function(code) {
        /* eslint no-process-exit: 0 */
        process.exit(code);
    });
} else {
    // When you do `gulp` in command line.
    var gulp = require('gulp');

    var eslint = require('gulp-eslint');
    var uglify = require('gulp-uglify');
    var conkitty = require('gulp-conkitty');
    var concat = require('gulp-concat');
    var filter = require('gulp-filter');
    var prefix = require('gulp-autoprefixer');
    var minifyCSS = require('gulp-minify-css');
    var template = require('gulp-template');
    var flatten = require('gulp-flatten');
    var gutil = require('gulp-util');
    var subsetProcess = require('gulp-subset-process');
    var rename = require('gulp-rename');

    var del = require('del');
    var fs = require('fs');
    var _ = require('lodash');
    var format = require('util').format;

    var devServe = require('devserve');
    var nyanoislands = require('nyanoislands');

    var CONFIG;


    gulp.task('clean', function(cb) {
        del([CONFIG.dest], cb);
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


    gulp.task('app', function() {
        var cssFilter = filter('**/*.css'),
            jsFilter = filter('**/*.js'),
            tplFilter = filter('**/*.tpl.*');

        var appStylesheets = [],
            appScripts = [];

        return gulp.src(CONFIG.dependencies)
            .pipe(subsetProcess('**/*.ctpl', function(src) { return src.pipe(conkitty({
                common: {file: 'common.js', 'concat.js': false},
                templates: 'tpl.js',
                deps: true,
                libs: {nyanoislands: nyanoislands}
            })); }))
            .pipe(tplFilter)
            .pipe(template(CONFIG))
            .pipe(tplFilter.restore())
            .pipe(jsFilter)
            .pipe(CONFIG.mode === 'production' ? concat('app.js') : gutil.noop())
            .pipe(jsFilter.restore())
            .pipe(cssFilter)
            .pipe(CONFIG.mode === 'production' ? concat('app.css') : gutil.noop())
            .pipe(prefix('last 1 version', '> 1%'))
            .pipe(cssFilter.restore())
            .pipe(flatten())
            .pipe(gulp.dest(CONFIG.physicalStatic))
            .on('data', function(file) {
                file = path.basename(file.path);
                var ext = path.extname(file);
                if (ext === '.css') { appStylesheets.push(file); }
                if (ext === '.js') { appScripts.push(file); }
            })
            .on('end', function() {
                CONFIG.appStylesheets = appStylesheets;
                CONFIG.appScripts = appScripts;

                gulp.src(CONFIG.app.page.src)
                    .pipe(template(CONFIG))
                    .pipe(rename(CONFIG.app.page.dest))
                    .pipe(gulp.dest(CONFIG.dest));
            });
    });


    gulp.task('uglify', ['app'], function() {
        if (CONFIG.mode === 'production') {
            gulp.src(CONFIG.dest + '/**/*.js')
                .pipe(uglify({preserveComments: 'some'}))
                .pipe(gulp.dest(CONFIG.dest));

            gulp.src(CONFIG.dest + '/**/*.css')
                .pipe(minifyCSS())
                .pipe(gulp.dest(CONFIG.dest));
        }
    });


    gulp.task('favicon', function() {
        gulp.src(CONFIG.app.page.favicon)
            .pipe(rename('favicon.ico'))
            .pipe(gulp.dest(CONFIG.dest));
    });


    gulp.task('server.json', ['app'], function() {
        fs.writeFileSync(path.join(CONFIG.dest, 'server.json'), JSON.stringify(CONFIG.server, undefined, 4));
    });


    gulp.task('serve', ['app', 'favicon'], function() {
        gulp.watch([].concat(CONFIG.dependencies, CONFIG.app.static.watch || []), ['app']);
        devServe(CONFIG.server, CONFIG.dest);
    });


    gulp.task('default', ['eslint', 'app', 'favicon', 'uglify', 'server.json']);


    CONFIG = (function() {
        var server = JSON.parse(fs.readFileSync('server.json', {encoding: 'utf8'})),
            app = JSON.parse(fs.readFileSync('app.json', {encoding: 'utf8'})),
            dest = path.resolve(app.dest || 'target/www'),
            build = process.env.MAVEN_VERSION || process.env.BUILD_VERSION || '0',
            dep,
            files,
            i,
            dependencies = [],
            externalScripts = [],
            externalStylesheets = [];

        for (i = 0; i < app.dependencies.length; i++) {
            /* eslint no-loop-func: 0 */
            dep = app.dependencies[i];
            files = dep.files;
            if (typeof files === 'string') { files = [files]; }
            if (!(files instanceof Array)) {
                throw new Error(format('Incorrect dependecy files (%s)', i));
            }

            switch (dep.type) {
                case 'module':
                    if (typeof dep.name !== 'string' || !dep.name) {
                        throw new Error(format('Incorrect dependecy name (%s)', i));
                    }
                    dep = path.dirname(require.resolve(dep.name));
                    files.forEach(function(file) {
                        dependencies.push(path.join(dep, file));
                    });
                    break;

                case 'file':
                    files.forEach(function(file) {
                        dependencies.push(file);
                    });
                    break;

                case 'script':
                    files.forEach(function(file) { externalScripts.push(file); });
                    break;

                case 'stylesheet':
                    files.forEach(function(file) { externalStylesheets.push(file); });
                    break;

                default:
                    throw new Error(format('Unknown dependecy type `%s`', dep.type));
            }
        }

        return processTemplates({
            app: app,
            server: server,
            mode: gutil.env.mode || 'development',
            build: build,
            dest: dest,
            static: path.join('/<%= app.static.web %>', build),
            physicalStatic: path.join(dest, '<%= app.static.dir %>', build),
            dependencies: dependencies,
            externalStylesheets: externalStylesheets,
            externalScripts: externalScripts
        });

        function processTemplates(obj, data) {
            if (!data) { data = obj; }

            var j,
                keys,
                key,
                oldKey,
                newObj;

            if (typeof obj === 'string') {
                return _.template(obj, data);
            }

            if (obj instanceof Array) {
                for (j = 0; j < obj.length; j++) {
                    obj[j] = processTemplates(obj[j], data);
                }
            } else if (typeof obj === 'object') {
                keys = Object.keys(obj);
                if (keys.length) {
                    newObj = {};
                    for (j = 0; j < keys.length; j++) {
                        oldKey = keys[j];
                        key = processTemplates(oldKey, data);
                        newObj[key] = processTemplates(obj[oldKey], data);
                    }
                    obj = newObj;
                }
            }

            return obj;
        }
    })();
}
