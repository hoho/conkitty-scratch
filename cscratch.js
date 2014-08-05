'use strict';

module.exports = function createProject(dest, name, description, repo, author) {
    var gulp = require('gulp'),
        fs = require('fs'),
        path = require('path'),
        colors = require('colors');

    if (!dest) {
        console.log(('Error: destination is empty').red);
        process.exit(1);
    }

    dest = path.resolve(dest);

    if (fs.existsSync(dest)) {
        console.log(('Error: "' + dest + '" already exists').red);
        process.exit(1);
    }

    gulp.src([path.join(__dirname, 'template/**/*'), path.join(__dirname, 'template/.gitignore'), '!**/package.json'])
        .pipe(gulp.dest(dest))
        .on('end', function() {
            name = name || path.basename(path.resolve(dest));

            var packageJSON = JSON.parse(fs.readFileSync(path.join(__dirname, 'template/package.json'), {encoding: 'utf8'}));
            packageJSON.name = name;
            if (typeof ((packageJSON.description = description)) !== 'string') { delete packageJSON.description; }
            if (typeof ((packageJSON.repository.url = repo)) !== 'string') { delete packageJSON.repository; }
            if (typeof ((packageJSON.author = author)) !== 'string') { delete packageJSON.author; }
            fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(packageJSON, undefined, 4));
        });
};
