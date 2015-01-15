var notify = require("gulp-notify");

module.exports = function() {

    var args = Array.prototype.slice.call(arguments);

    // push error to notification center
    notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
    }).apply(this, args);

    // make sure gulp doesn't choke on this task
    this.emit('end');
};
