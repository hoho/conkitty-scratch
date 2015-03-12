{
    "private": true,
    "name": "<%- name %>",
    "version": "0.0.0",
    <% if (typeof description === 'string') { %>"description": "<%- description %>",
    <% } %><% if (typeof repo === 'string') { %>"repository": {
        "type": "git",
        "url": "<%- repo %>"
    },
    <% } %><% if (typeof author === 'string') { %>"author": "<%- author %>",
    <% } %>"license": "(c) Yandex LLC",
    "dependencies": {},
    "devDependencies": {
        "gulp": "~3.8.11",
        "gulp-plumber": "~1.0.0",
        "gulp-eslint": "~0.6.0",
        "gulp-rename": "~1.2.0",
        "gulp-uglify": "~1.1.0",
        "gulp-conkitty": "~0.5.13",
        "gulp-concat": "~2.5.2",
        "gulp-filter": "~2.0.2",
        "gulp-autoprefixer": "~2.1.0",
        "gulp-minify-css": "~1.0.0",
        "gulp-template": "~3.0.0",
        "gulp-flatten": "~0.0.4",
        "gulp-util": "~3.0.4",
        "gulp-subset-process": "~0.1.0",
        "gulp-as-css-imports": "~0.0.2",
        "gulp-dedupe": "~0.0.2",
        "gulp-less": "~3.0.1",
        "gulp-inject-string": "~0.0.2",
        "through": "~2.3.6",
        "lodash": "~3.5.0",
        "del": "~1.1.1",
        "devserve": "~0.0.3",
        "conkitty-app": "~0.0.1",
        "histery": "~0.7.6",
        "concat.js": "~0.9.5",
        "conkitty-route": "~0.7.5",
        "nyanoislands": "~0.1.15",
        "jquery": "~2.1.3"
    }
}
