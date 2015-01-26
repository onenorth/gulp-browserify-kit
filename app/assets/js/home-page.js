/*
 Entry point for the my-page.js bundle

 Please reference the browserify.bundleConfigs section in gulp/tasks/config.js
 */

var $ = require('jquery');
var _ = require('underscore');

/*
 TODO: Add note about how we are able to reference jQuery and underscore
    which are bundled in the global.js file
 */

var messageTmpl = _.template("<p>Crafted with <%= emotions %> by <a href='<%= creatorUrl %>'><%= creatorName %></a></p>");

var message = messageTmpl({
    creatorName: 'One North Interactive',
    creatorUrl: 'http://www.onenorth.com',
    emotions: '♥'
});

$('.js-ui-footer').append(message);

console.log('LOADED: my-page.js');
