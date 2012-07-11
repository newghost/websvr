/*
Main : start the server
*/

var urlMapper = new UrlMapper();
var viewSvr = new ViewSvr("./../", 8000, urlMapper);
viewSvr.start();

/*
UrlMapper example: close server
http://localhost:8000/admin/close
*/
urlMapper.add(/admin\/close/g, function(req, res){
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("server is closed");
  viewSvr.close();
});