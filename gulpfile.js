'use strict';

var gulp = require('gulp');
var eslint = require('gulp-eslint');


gulp.task('eslint', function() {
    return gulp.src(['gulpfile.js', 'cscratch.js'])
        .pipe(eslint({
            rules: {
                'quotes': [2, 'single'],
                'no-shadow-restricted-names': 0,
                'no-underscore-dangle': 0,
                'no-use-before-define': [2, 'nofunc']
            },
            env: {node: true}
        }))
        .pipe(eslint.format());
});


gulp.task('default', ['eslint']);
