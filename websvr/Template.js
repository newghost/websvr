/*
* Templates
*/
var Template = (function() {

  var engine  = require("./lib/doT");

  //get a file
  var getFile = function(filename, cb){
    var fullpath = path.join(Settings.root, filename);

    fs.readFile(fullpath, function (err, html) {
      err && console.log(err);
      err ? cb("") : cb(html);
    });
  };

  //render a file
  var render = function(chrunk, params, outFn){
    try {
      tmplFn = engine.compile(chrunk, params);
      outFn(tmplFn(params));
    } catch(err) {
      console.log(err);
      outFn(err);
    }
  };

  return {
    //render templates
    render: function(chrunk, params) {
      var res = this,
          end = res.end;

      var url = chrunk.url,
          con = chrunk.constructor;

      //It's a http request (it has "url")
      if (url) { 
        getFile(url, function(tmpl) {
          render(tmpl, params, end);
        });
      
      //It's html contents (template codes)
      } else if (con == String) {
        render(chrunk, params, end);

      //It's Array object (template file path)
      } else if (con == Array) {
        getFile(chrunk[0], function(tmpl) {
          render(tmpl, params, end);
        });

      //Nothing matched end the response
      } else {
        end();
      }

    }
  }

}());