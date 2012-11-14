/*
Body parser, parse the data in request body via 
when parse complete, execute the callback, with response data;
*/
var BodyParser = function(req, res, callback) {

  var buffer = new Buffer(Settings.bufferSize);

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