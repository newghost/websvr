/*
Logger: log sth
*/
var Logger = (function(){

  var fs = require("fs"),
      path = require("path");

  var lineSeparator = "\r\n",
      indentSeparator = "\t",
      depth = 9;

  var log = function(logObj){

    var output = new Date() + lineSeparator;

    function print(pre, obj){
      if(!obj) return;
      for(var key in obj){
        output = output + pre + key + " : " + obj[key] + lineSeparator;
        if(typeof obj[key] == "object"){
          (pre.length < depth) && print(pre + indentSeparator, obj[key]);
        }
      }
    }

    print(indentSeparator, logObj);

    fs.appendFile(Settings.logger, output, function(err){
      console.log(err);
    });
  };

  return { log: log };

})();