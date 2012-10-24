
//Start the WebSVr, runnting at parent folder, default port is 8054, directory browser enabled;
//Trying at: http://localhost:8054
var webSvr = new WebSvr({root:"./../"});
webSvr.start();

/*
Filter: test/* => (session validation function);
  parse:parse the post data and stored to req.body;
  session: init the session and stored in req.session; 
*/
webSvr.filter(/test\/[\w\.]+/, function(req, res){
  //It's not index.htm/login.do, do the session validation
  if(req.url.indexOf("index.htm") < 0 && req.url.indexOf("login.do") < 0){
    !req.session.get("username") && res.end("You must login, first!");
  }

  //Link to next filter
  req.filter.next(req, res);
}, {parse: true, session: true});


/*
Handler: login.do => (validate the username & password)
  username: admin
  password: 12345678
*/
webSvr.session(/login.do/, function(req, res){
  var querystring = require("querystring");

  //TODO: Add an parameter to auto-complete querystring.parse(req.body);
  var qs = querystring.parse(req.body);
  if(qs.username == "admin" && qs.password == "12345678"){
    //Put key/value pair in session
    //TODO: Support put JSON object directly
    req.session.set("username", qs.username, function(session){
      //TODO: Add req.redirect / req.forward functionalities;
      res.writeHead(200, {"Content-Type": "text/html"});
      res.writeFile("/test/setting.htm");
    });
  }else{
    res.writeHead(401);
    res.end("Wrong username/password");
  }
});

/*
Uploader: upload.do => (receive handler)
*/
webSvr.file(/upload.do/, function(req, res){
  res.writeHead(200, {"Content-Type": "text/plain"});
  //Upload file is stored in req.files
  //form fields is stored in req.body
  res.write(JSON.stringify(req.body));
  res.end(JSON.stringify(req.files));
});


/*
Simple redirect API:
*/
//Mapping "combine" to tool/Combine.js, trying at: http://localhost:8054/combine
webSvr.url(/combine/, ["svr/tool/Combine.js"]);
//Mapping "hello" to a string, trying at http://localhost:8054/hello
webSvr.url(/hello/, "Hello WebSvr!");
//Mapping "post" and parse the post in the request, trying at: http://localhost:8054/post.htm
webSvr.post(/post.htm/, function(req, res){
  res.writeHead(200, {"Content-Type": "text/html"});
  //Need session support
  res.write("You username is " + req.session.get("username"));
  res.write('<form action="" method="post"><input name="input" /></form><br/>');
  res.end('Received : ' + req.body);
}, {session: true});