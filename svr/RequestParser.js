/*
Request parser, parse the data in request body via 
when parse complete, execute the callback, with response data;
*/
var RequestParser;

(function(){

  //TODO: Is there a bug, how about 2 users update a file, what's will happened for buffer;
  var MAX_SIZE = 16 * 1024 * 1024,
      buffer = new Buffer(MAX_SIZE);

  RequestParser = function(req, res, callback){
    var length = 0, data = "";

    req.on('data', function(chunk) {
      chunk.copy(buffer, length, 0, chunk.length);
      length += chunk.length;
    });

    req.on('end', function() {
      data = length > 0 ? buffer.toString('utf8', 0, length) : "";
      callback(data);
    });
  };

}());