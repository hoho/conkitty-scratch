'use strict';

module.exports = function createProject(dest, name, description, repo, author) {
    var gulp = require('gulp'),
        fs = require('fs'),
        path = require('path'),
        colors = require('colors'),
        template = require('lodash').template;

    if (!dest) {
        console.log(('Error: destination is empty').red);
        process.exit(1);
    }

    dest = path.resolve(dest);

    if (fs.existsSync(dest)) {
        console.log(('Error: "' + dest + '" already exists').red);
        process.exit(1);
    }

    gulp.src([path.join(__dirname, 'template/**/*'), path.join(__dirname, 'template/.gitignore'), '!**/package.tpl.json'])
        .pipe(gulp.dest(dest))
        .on('end', function() {
            name = name || path.basename(path.resolve(dest));

            var packageJSON = fs.readFileSync(path.join(__dirname, 'template/package.tpl.json'), {encoding: 'utf8'});

            fs.writeFileSync(path.join(dest, 'package.json'), template(packageJSON, {
                name: name,
                description: description,
                repo: repo,
                author: author
            }));
        });
};
