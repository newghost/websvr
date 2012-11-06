WebSvr
==============
Lincense: MIT, GPL

Description:
--------------
A simple web server based on node.js

Version: 0.024
--------------
- Filter: A request will try to match all the filters first, and then pass to the Handler
- Handler: When a request matched a handler, it will returned, only one handler will be executed
- Session: Stored in file, with JSON format
- File: Support uploading files

Start
--------------
Edit in SiteTest.js or Create a new Site.js and added to MakeFile.list

    //Start the WebSVr, runnting at parent folder, default port is 8054, directory browser enabled;
    //Trying at: http://localhost:8054
    var webSvr = new WebSvr({
      root: "../",
      listDir: true,
      https: true,
      httpsPort: 8443
    });

    webSvr.start();

Filter
--------------
Session based authentication (session stored in files), all the request under "test/" will parse the post data and session by default, except the "index.htm" and "login.do"

    /*
    General filter: parse the post data / session before all request
      parse:   parse the post data and stored in req.body;
      session: init the session and stored in req.session; 
    */
<<<<<<< HEAD
    webSvr.filter(function(req, res){
      //TODO: Add greeting words in filter
      //res.write("Hello WebSvr!<br/>");

      //Link to next filter
      req.filter.next(req, res);
    }, {parse:true, session:true});

    /*
    Session Filter: protect test/* folder => (validate by session);
    */
    webSvr.filter(/test\/[\w\.]+/, function(req, res){
=======
    webSvr.filter(/test\/[\w\.]+/, function(req, res) {
>>>>>>> optimize
      //It's not index.htm/login.do, do the session validation
      if (req.url.indexOf("index.htm") < 0 && req.url.indexOf("login.do") < 0) {
        !req.session.get("username") && res.end("You must login, first!");
      }

      //Link to next filter
      req.filter.next(req, res);
    });


Handler
--------------
Handle Login and put the username in Session

    /*
    Handler: login.do => (validate the username & password)
      username: admin
      password: 12345678
    */
<<<<<<< HEAD
    webSvr.session("login.do", function(req, res){
=======
    webSvr.session(/login.do/, function(req, res) {
>>>>>>> optimize
      var querystring = require("querystring");

      //TODO: Add an parameter to auto-complete querystring.parse(req.body);
      var qs = querystring.parse(req.body);
      if (qs.username == "admin" && qs.password == "12345678") {
        //Put key/value pair in session
        //TODO: Support put JSON object directly
        req.session.set("username", qs.username, function(session) {
          //TODO: Add req.redirect / req.forward functionalities;
          res.writeHead(200, {"Content-Type": "text/html"});
          res.writeFile("/test/setting.htm");
        });
      }else{
        res.writeHead(401);
        res.end("Wrong username/password");
      }
    });

File
--------------
Receive upload file (it's a specfic filter)

    /*
    Uploader: upload.do => (receive handler)
    */
<<<<<<< HEAD
    webSvr.file("upload.do", function(req, res){
=======
    webSvr.file(/upload.do/, function(req, res) {
>>>>>>> optimize
      res.writeHead(200, {"Content-Type": "text/plain"});
      //Upload file is stored in req.files
      //form fields is stored in req.body
      res.write(JSON.stringify(req.body));
      res.end(JSON.stringify(req.files));
    });


Other APIs
--------------
Redirect

    /*
    Redirect: redirect request, try at: http://localhost:8054/redirect
    */
    webSvr.url("redirect", function(req, res){
      res.redirect("/svr/websvr.all.js");
    });

Url Mapping

    //Mapping "combine" to tool/Combine.js, trying at: http://localhost:8054/combine
    webSvr.url(/combine/, ["svr/tool/Combine.js"]);
    //Mapping "hello" to a string, trying at http://localhost:8054/hello
    webSvr.url(/hello/, "Hello WebSvr!");

Post Data

    //Mapping "post" and parse the post in the request, trying at: http://localhost:8054/post.htm
    webSvr.post(/post.htm/, function(req, res) {
      res.writeHead(200, {"Content-Type": "text/html"});
      //Need session support
      res.write("You username is " + req.session.get("username"));
      res.write('<form action="" method="post"><input name="input" /></form><br/>');
      res.end('Received : ' + req.body);
    }, {session: true});