/* global $C */
/* global $ */
$C.route
    .add('/', {
        title: 'Index',
        render: 'page',
        frames: {
            '/': {
                parent: '#page__content',
                render: 'index'
            },
            '/?text=:text': {
                id: 'search',
                title: 'Search',
                parent: '#page__content',
                data: function() {
                    var ret = new $.Deferred();
                    setTimeout(function() {
                        var data = [],
                            i;
                        for (i = 0; i < 10; i++) {
                            data.push(Math.random());
                        }
                        ret.resolve(data);
                    }, 1500);
                    return ret;
                },
                render: {
                    before: 'search__loading',
                    success: 'search',
                    error: 'search_error'
                }
            }
        }
    })
    .add('/about', {
        title: 'About',
        render: 'about'
    })
    .run();
