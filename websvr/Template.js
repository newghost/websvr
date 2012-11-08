/*
* Templates
*/
var Template = (function() {

  var engine  = require("./lib/doT"),
      fs      = require("fs"),
      path    = require("path");

  //render a file
  var renderFile = function(filename, cb){
    var fullpath = path.join(Settings.root, filename);

    fs.readFile(fullpath, function (err, html) {
      err && console.log(err);
      err ? cb("") : cb(html);
    });
  };

  return {
    //render templates
    render: function(chrunk, params, cb) {
      var tmplFn = function(){};

      //Not defined? passing an empty function
      cb = cb || function(){};

      try {
        switch (chrunk.constructor) {
          //It's html files
          case String:
            tmplFn = engine.compile(chrunk, params);
            cb(tmplFn(params));
            break;

          //It's a file
          case Array:
            renderFile(chrunk[0], function(html) {
              tmplFn = engine.compile(html, params);
              cb(tmplFn(params));
            });
            break;
        }
      } catch (e) {
        cb(e);
      }
    }
  }

}());