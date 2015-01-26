var Backbone, _;

_ = require('underscore');
Backbone = require('backbone');
Backbone.$ = require('jquery');

//var jqueryPlugin = require('jquery-plugin');


(function() {

    "use strict";

    function _something() {
        return "something neat";
    }

    function _someOtherThing() {
        return "some other thing";
    }

    function _init() {
        // call the jquery plugin
        // jqueryPlugin();
    }

    return {
        init: _init,
        something: _something,
        someOtherThing: _someOtherThing
    };


}());
