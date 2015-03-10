'use strict';

module.exports = function createProject(callback) {
    var fs = require('fs'),
        path = require('path'),
        program = require('commander');

    var packageJSON = path.join(__dirname, 'package.json');

    program
        .version(JSON.parse(fs.readFileSync(packageJSON, {encoding: 'utf8'})).version)
        .usage('[options] <dest>')
        .option('-n, --name [project]', 'Project name')
        .option('-d, --desc [description]', 'Project description')
        .option('-r, --repo [repository]', 'Git repository link')
        .option('-a, --author [author]', 'Author name')
        .parse(process.argv);

    if (program.args.length !== 1) {
        program.help();
    }


    var dest = program.args[0],
        name = program.name,
        description = program.desc,
        repo = program.repo,
        author = program.author;


    var gulp = require('gulp'),
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

    gulp.src([path.join(__dirname, 'template/**/*'),
              path.join(__dirname, 'template/.gitignore'),
              '!**/package.json.tpl'])
        .pipe(gulp.dest(dest))
        .on('end', function() {
            // Workaround for https://github.com/tj/commander.js/issues/284.
            name = (typeof name === 'function' ? undefined : name) || path.basename(path.resolve(dest));

            var packageJSONTpl = fs.readFileSync(path.join(__dirname, 'template/package.json.tpl'), {encoding: 'utf8'});

            fs.writeFileSync(path.join(dest, 'package.json'), template(packageJSONTpl)({
                name: name,
                description: description,
                repo: repo,
                author: author
            }));

            if (callback) {
                callback(dest);
            }
        });
};
