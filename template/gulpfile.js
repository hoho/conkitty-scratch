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
    var asCSSImports = require('gulp-as-css-imports');
    var rename = require('gulp-rename');
    var dedupe = require('gulp-dedupe');
    var less = require('gulp-less');
    var inject = require('gulp-inject-string');

    var through = require('through');
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

        gulp.src(['pages/**/*.js', '!pages/themes.js', 'blocks/**/*.js', 'routes/**/*.js'])
            .pipe(eslint({rules: rules, env: {browser: true}}))
            .pipe(eslint.format());
    });


    gulp.task('app', function(err) {
        var themes = {};
        var scripts = {};
        var inlines = {};
        var filesStreamCount = 0;
        var inlinesDeferred = [];
        var inlinesStreamCount = 0;
        var retStream = through();
        var errored;

        (CONFIG.app.themes).forEach(function(theme) {
            if (errored) { return; }
            themes[theme] = [];
            scripts[theme] = {};
            inlines[theme] = {};

            Object.keys(CONFIG.dependencies).forEach(function(bundle) {
                if (errored) { return; }
                var contents = CONFIG.dependencies[bundle],
                    themeFile = bundle + '.' + theme + '.css';

                scripts[theme][bundle] = [];
                inlines[theme][bundle] = {'.css': [], '.js': []};

                if (contents.files.length) {
                    filesStreamCount++;

                    var cssFilter = filter('**/*.css');
                    var jsFilter = filter('**/*.js');

                    gulp.src(contents.files)
                        .pipe(subsetProcess(contents._templates, function(src) {
                            return src.pipe(template(_.assign({theme: theme}, CONFIG)));
                        }, {occurrence: 'keep'}))
                        .pipe(subsetProcess(['**/*.ctpl', '**/*.css'], function(src) {
                            return src.pipe(subsetProcess('**/*.ctpl', function(src) {
                                return src.pipe(conkitty({
                                    common: {file: '$C_common.js', 'concat.js': false},
                                    templates: '$C_tpl.js',
                                    deps: true,
                                    libs: {nyanoislands: nyanoislands},
                                    env: {theme: theme}
                                }));
                            }));
                        }))
                        .pipe(flatten())
                        .pipe(subsetProcess('**/*.less', function(src) {
                            return src
                                .pipe(inject.prepend('@import "' + path.relative('.', nyanoislands.LESS[theme]) + '";\n'))
                                .pipe(rename(function(path) { path.basename += '.' + theme; }))
                                .pipe(less());
                        }, {occurrence: 'keep'}))
                        .pipe(cssFilter)
                        .pipe(prefix('last 1 version', '> 1%'))
                        .pipe(CONFIG.mode === 'prod' ? concat(themeFile) : asCSSImports(themeFile))
                        .pipe(cssFilter.restore())
                        .pipe(jsFilter)
                        .pipe(CONFIG.mode === 'prod' ? concat(bundle + '.js') : gutil.noop())
                        .pipe(jsFilter.restore())
                        .on('data', function(file) {
                            if (errored) { return; }
                            // Push files to result stream.
                            if (path.resolve(file.path) === path.resolve(themeFile)) {
                                themes[theme].push(themeFile);
                            }
                            retStream.emit('data', file);
                            // Remember scripts to include them into html file.
                            var filename = path.basename(file.path);
                            var ext = path.extname(filename);
                            if (ext === '.js') { scripts[theme][bundle].push(filename); }
                        })
                        .on('end', filesStreamEnd);
                } else if (contents.inlines.files.length) {
                    inlinesStreamCount++;
                    (function(contents, theme, bundle) {
                        // Defer inlines processing to be able to provide
                        // `appThemes`, `appScripts` and `appInlines` which are
                        // dependent from dependencies processing.
                        inlinesDeferred.push(function() {
                            if (errored) { return; }
                            var cssFilter = filter('**/*.css');

                            gulp.src(contents.inlines.files)
                                .pipe(subsetProcess(contents._templates, function(src) {
                                    return src.pipe(template(CONFIG));
                                }, {occurrence: 'keep'}))
                                .pipe(subsetProcess('**/*.less', function(src) {
                                    return src
                                        .pipe(inject.prepend('@import "' + path.relative('.', nyanoislands.LESS[theme]) + '";\n'))
                                        .pipe(rename(function(path) { path.basename += '.' + theme; }))
                                        .pipe(less());
                                }, {occurrence: 'keep'}))
                                .pipe(cssFilter)
                                .pipe(prefix('last 1 version', '> 1%'))
                                .pipe(cssFilter.restore())
                                .on('data', function(file) {
                                    if (errored) { return; }
                                    var filename = path.basename(file.path);
                                    var ext = path.extname(filename);
                                    if (inlines[theme][bundle][ext]) {
                                        inlines[theme][bundle][ext].push(file.contents.toString());
                                    } else {
                                        appError('Only `.css` and `.js` could be inlined');
                                    }
                                })
                                .on('end', inlinesStreamEnd);
                        });
                    })(contents, theme, bundle);
                }
            });
        });

        if (!filesStreamCount) { filesStreamEnd(); }

        return retStream
            .pipe(dedupe({same: false})) // Enable the `same` setting when order plugin is fixed.
            .pipe(gulp.dest(CONFIG.physicalStatic));


        function filesStreamEnd() {
            if (errored) { return; }
            filesStreamCount--;
            if (filesStreamCount <= 0) {
                var s,
                    i;

                (CONFIG.app.themes).forEach(function(theme, index) {
                    if (errored) { return; }
                    if (index === 0) {
                        s = scripts[theme];
                        i = inlines[theme];
                    } else {
                        if (!_.isEqual(s, scripts[theme]) || !_.isEqual(i, inlines[theme])) {
                            appError('Scripts and inlines should be the same for each theme');
                        }
                    }
                });

                CONFIG.appThemes = themes;
                CONFIG.appScripts = s;
                CONFIG.appInlines = i;

                var cb;
                while ((cb = inlinesDeferred.shift())) { cb(); }
                if (!inlinesStreamCount) { inlinesStreamEnd(); }
            }
        }

        function inlinesStreamEnd() {
            if (errored) { return; }
            inlinesStreamCount--;
            if (inlinesStreamCount <= 0) {
                gulp.src(CONFIG.app.singlePage.src)
                    .pipe(CONFIG.app.singlePage['_.template'] ? template(CONFIG) : gutil.noop())
                    .pipe(rename(CONFIG.app.singlePage.dest))
                    .pipe(gulp.dest(CONFIG.dest))
                    .on('end', function() { retStream.emit('end'); });            }
        }

        function appError(msg) {
            if (!errored) {
                errored = true;
                err(msg);
            }
        }
    });


    gulp.task('uglify', ['app'], function() {
        if (CONFIG.mode === 'prod') {
            gulp.src(CONFIG.dest + '/**/*.js')
                .pipe(uglify({preserveComments: 'some'}))
                .pipe(gulp.dest(CONFIG.dest));

            gulp.src(CONFIG.dest + '/**/*.css')
                .pipe(minifyCSS())
                .pipe(gulp.dest(CONFIG.dest));
        }
    });


    gulp.task('favicon', function() {
        gulp.src(CONFIG.app.singlePage.favicon)
            .pipe(rename('favicon.ico'))
            .pipe(gulp.dest(CONFIG.dest));
    });


    gulp.task('server.json', ['app'], function() {
        fs.writeFileSync(
            path.join(CONFIG.dest, 'server.json'),
            JSON.stringify(CONFIG.app.server, undefined, 4)
        );
    });


    gulp.task('serve', ['app', 'favicon'], function() {
        var deps = [];
        Object.keys(CONFIG.dependencies).forEach(function(bundle) {
            deps = deps.concat(
                CONFIG.dependencies[bundle].files,
                CONFIG.dependencies[bundle].inlines.files
            );
        });
        deps = deps.concat(CONFIG.app.watch || [], CONFIG.app.singlePage.src);
        gulp.watch(deps, ['app']);
        devServe(
            CONFIG.app.server,
            CONFIG.dest,
            CONFIG.app.serverPort && CONFIG.app.serverPort.development || 8080
        );
    });


    gulp.task('default', ['eslint', 'app', 'favicon', 'uglify', 'server.json']);


    CONFIG = (function() {
        var app = JSON.parse(fs.readFileSync('app.json', {encoding: 'utf8'})),
            dest = path.resolve(app.dest || 'target/www'),
            build = process.env.MAVEN_VERSION || process.env.BUILD_VERSION || '0',
            dependencies = {};

        Object.keys(app.dependencies).forEach(function(bundle) {
            var templates = [];

            dependencies[bundle] = {
                files: [],
                externalScripts: [],
                externalStylesheets: [],
                _templates: templates,
                inlines: {
                    files: [],
                    _templates: templates
                }
            };

            processBundleDeclaration(bundle, app.dependencies[bundle], dependencies[bundle]);
            delete dependencies[bundle].inlines._templates;
        });

        return processTemplates({
            app: app,
            mode: gutil.env.mode || 'development',
            build: build,
            dest: dest,
            static: path.join('/<%= app.static.web %>', build),
            physicalStatic: path.join(dest, '<%= app.static.dest %>', build),
            dependencies: dependencies
        });


        function processBundleDeclaration(bundle, bundleContents, ret, noExternals) {
            bundleContents.forEach(function(dep, index) {
                var contents = dep.contents,
                    lodashtpl = dep['_.template'];

                if (!(contents instanceof Array)) {
                    throw new Error(format('Dependency contents should be array (%s: %s)', bundle, index));
                }

                switch (dep.type) {
                    case 'inline':
                        if (noExternals) {
                            throw new Error(format('Inline dependency cannot have inline dependencies (%s: %s)', bundle, index));
                        }

                        if (ret.files.length || ret.externalScripts.length || ret.externalStylesheets.length) {
                            throw new Error(format('In order not to get a mess during bundle concatenation, use separate bundles for inline, script/stylesheet and file/module dependencies (%s: %s)', bundle, index));
                        }

                        processBundleDeclaration(bundle, contents, ret.inlines, true);
                        break;

                    case 'module':
                        if (typeof dep.name !== 'string' || !dep.name) {
                            throw new Error(format('Incorrect dependecy module name (%s: %s)', bundle, index));
                        }

                        if (!noExternals && (ret.inlines.files.length || ret.externalScripts.length || ret.externalStylesheets.length)) {
                            throw new Error(format('In order not to get a mess during bundle concatenation, use separate bundles for inline, script/stylesheet and file/module dependencies (%s: %s)', bundle, index));
                        }

                        dep = path.dirname(require.resolve(dep.name));
                        contents.forEach(function(file) {
                            dep = path.join(dep, file);
                            ret.files.push(dep);
                            if (lodashtpl) { ret._templates.push(path.basename(dep)); }
                        });
                        break;

                    case 'file':
                        if (!noExternals && (ret.inlines.files.length || ret.externalScripts.length || ret.externalStylesheets.length)) {
                            throw new Error(format('In order not to get a mess during bundle concatenation, use separate bundles for inline, script/stylesheet and file/module dependencies (%s: %s)', bundle, index));
                        }

                        contents.forEach(function(file) {
                            ret.files.push(file);
                            if (lodashtpl) { ret._templates.push(path.basename(file)); }
                        });
                        break;

                    case 'script':
                        if (noExternals) {
                            throw new Error(format('Inline dependency cannot be external (%s: %s)', bundle, index));
                        }

                        if (ret.inlines.files.length || ret.files.length) {
                            throw new Error(format('In order not to get a mess during bundle concatenation, use separate bundles for inline, script/stylesheet and file/module dependencies (%s: %s)', bundle, index));
                        }

                        contents.forEach(function(file) { ret.externalScripts.push(file); });
                        break;

                    case 'stylesheet':
                        if (noExternals) {
                            throw new Error(format('Inline dependency cannot be external (%s: %s)', bundle, index));
                        }

                        if (ret.inlines.files.length || ret.files.length) {
                            throw new Error(format('In order not to get a mess during bundle concatenation, use separate bundles for inline, script/stylesheet and file/module dependencies (%s: %s)', bundle, index));
                        }

                        contents.forEach(function(file) { ret.externalStylesheets.push(file); });
                        break;

                    default:
                        throw new Error(format('Unknown dependecy type `%s`', dep.type));
                }
            });
        }


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
