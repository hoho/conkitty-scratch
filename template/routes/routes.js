/* global $CR */
/* global $CA */
/* global Promise */
(function($CR, $CA) {
    'use strict';

    $CR
        .add('/', {
            title: 'Index',
            render: 'page',
            frames: {
                '/': {
                    parent: '.page__content',
                    render: 'index'
                },
                '/?text=:text': {
                    id: 'search',
                    title: 'Search',
                    parent: '.page__content',
                    keep: false,
                    data: function() {
                        return new Promise(function(resolve) {
                            setTimeout(function() {
                                var data = [],
                                    i;
                                for (i = 0; i < 10; i++) {
                                    data.push(Math.random());
                                }
                                resolve(data);
                            }, 1000);
                        });
                    },
                    render: {
                        '-before': 'search__loading',
                        success: 'search',
                        error: 'search__error'
                    }
                }
            }
        })
        .add('/about', {
            title: 'About',
            render: 'about'
        })
        .on('busy idle', function(e) {
            document.body.style.opacity = e === 'busy' ? 0.7 : 1;
        });

    $CA.ready(function() {
        $CR.run();
    });
})($CR, $CA);
