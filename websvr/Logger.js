/*
Logger: log sth
*/
var Logger = (function() {

  var lineSeparator   = "\r\n",
      indentSeparator = "\t",
      depth = 9;

  var Settings = Settings || { debug: true };

  var write = function(logObj, dep) {
    var depth   = dep || depth,
        output  = new Date() + lineSeparator;

    function print(pre, obj) {
      if (!obj) return;
      for (var key in obj) {
        var val = obj[key];
        output = output + pre + key + " : " + val + lineSeparator;
        if (typeof val == "object") {
          (pre.length < depth) && print(pre + indentSeparator, val);
        }
      }
    }

    print(indentSeparator, logObj);

    fs.appendFile(Settings.logger, output, function(err) {
      log(err);
    });
  };

  /*
  Currnetly it's equal to console.log
  */
  var log = function() {
    console.log.apply(console, arguments);
  };

  /*
  Add data before log information
  */
  var debug = function() {
    //diable console.log information
    if (!Settings.debug) {
      return;
    }

    var d = new Date();

    Array.prototype.splice.call(arguments, 0, 0, d.toISOString());
    console.log.apply(console, arguments);
  };

  return {
      log:    log
    , write:  write
    , debug:  debug
  };

})();