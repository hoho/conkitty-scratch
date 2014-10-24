'use strict';

module.exports = function createProject(dest, name, description, repo, author) {
    var gulp = require('gulp'),
        fs = require('fs'),
        path = require('path'),
        template = require('lodash').template;

    require('colors');

    /* eslint no-process-exit:0 */

    if (!dest) {
        console.log(('Error: destination is empty').red);
        process.exit(1);
    }

    dest = path.resolve(dest);

    if (fs.existsSync(dest)) {
        console.log(('Error: "' + dest + '" already exists').red);
        process.exit(1);
    }

    gulp.src([path.join(__dirname, 'template/**/*'), path.join(__dirname, 'template/.gitignore'), '!**/package.json.tpl'])
        .pipe(gulp.dest(dest))
        .on('end', function() {
            name = name || path.basename(path.resolve(dest));

            var packageJSON = fs.readFileSync(path.join(__dirname, 'template/package.json.tpl'), {encoding: 'utf8'});

            fs.writeFileSync(path.join(dest, 'package.json'), template(packageJSON, {
                name: name,
                description: description,
                repo: repo,
                author: author
            }));
        });
};
