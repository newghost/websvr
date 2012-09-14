/*
Request parser,
when parse complete, execute the callback, with response data;
*/
var RequestParser = function(req, res, callback){
  var MAX_SIZE = 16 * 1024 * 1024,
      buffer = new Buffer(MAX_SIZE),
      length = 0,
      data = "";

  req.on('data', function(chunk) {
    chunk.copy(buffer, length, 0, chunk.length);
    length += chunk.length;
  });

  req.on('end', function() {
    data = length > 0 ? buffer.toString('utf8', 0, length) : "";
    callback(req, res, data);
  });
};