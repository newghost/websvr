/*
Logger: log sth
*/
var Logger = (function() {

  var lineSeparator = "\r\n",
      indentSeparator = "\t",
      depth = 9;

  var log = function(logObj, dep) {

    var depth = dep || depth;

    var output = new Date() + lineSeparator;

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
      console.log(err);
    });
  };

  return { log: log };

})();