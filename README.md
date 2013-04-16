WebSvr
==============
A simple web server based on node.js.
Lincenses: MIT

Features
--------------
- Designed for ARM: We need to keep embed device running stable in a very long time(> 1 year?), it may run into issues but it can restart and re-covery the user sessions automatically.
- Filter: A request will try to match all the filters first, and then pass to the Handler
- Handler: When a request matched a handler, it will returned, only one handler will be executed
- Session: Stored in file, with JSON format
- File: Support uploading files
- Custom index pages

Start
--------------
It's simple to start the websvr.

    //import WebSvr module, assume we don't have NPM.
    var WebSvr = require("./../../websvr/websvr.js");

    //Start the WebSvr, runnting at parent folder, default port is 8054, directory browser enabled;
    //Trying at: http://localhost:8054
    var webSvr = new WebSvr({
        root: "./"
      , listDir:  true
      , debug:    true
    }).start();


Filter
--------------
Session based authentication, basically useage:

    /*
    General filter: parse the post data / session before all request
      parse:   parse the post data and stored in req.body;
      session: init the session and stored in req.session; 
    */
    webSvr.filter(function(req, res) {
      //TODO: Add greeting words in filter
      //res.write("Hello WebSvr!<br/>");

      //Link to next filter
      req.filter.next();
    }, {parse:true, session:true});

Advanced useage: All the request under "test/" will parse the post data and session by default, except the "index.htm" and "login.do"

    /*
    Session Filter: protect web/* folder => (validation by session);
    */
    webSvr.filter(/web\/[\w\.]+/, function(req, res) {
      //It's not index.htm/login.do, do the session validation
      if (req.url.indexOf("index.htm") < 0 && req.url.indexOf("login.do") < 0) {
        req.session.get("username", function(val){
          console.log("session", val);

          !val && res.end("You must login, first!");
        });
      }

      //Link to next filter
      req.filter.next();
    });


Handler
--------------
Handle Login and put the username in Session

    /*
    Handler: login.do => (validate the username & password)
      username: admin
      password: 12345678
    */
    webSvr.session("login.do", function(req, res) {
      var querystring = require("querystring");

      //TODO: Add an parameter to auto-complete querystring.parse(req.body);
      var qs = querystring.parse(req.body);
      if (qs.username == "admin" && qs.password == "12345678") {
        //Put key/value pair in session
        //TODO: Support put JSON object directly
        req.session.set("username", qs.username, function(session) {
          //res.writeHead(200, {"Content-Type": "text/html"});
          //res.writeFile("/web/setting.htm");
          //TODO: Error handler of undefined methods
          console.log(session);
          res.redirect("/web/setting.htm");
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
    webSvr.file("upload.do", function(req, res) {
      res.writeHead(200, {"Content-Type": "text/plain"});
      //Upload file is stored in req.files
      //form fields is stored in req.body
      res.write(JSON.stringify(req.body));
      res.end(JSON.stringify(req.files));
    });

Template
--------------
Render template with params, using doT template engine

    webSvr.url("template.node", function(req, res) {
      res.writeHead(200, {"Content-Type": "text/html"});
      //render template with session: { "username" : "admin" }
      req.session.get(function(session) {
        res.render(req, session);
      });
    });

Other APIs
--------------
Redirect, Url Mapping, Post Data

    webSvr
      //Mapping "sitest" to tool/Combine.js, trying at: http://localhost:8054/combine
      .url("sitetest", ["svr/sitetest.js"])
      //Mapping "hello" to a string, trying at http://localhost:8054/hello
      .url("hello", "Hello WebSvr!")
      //Mapping "post" and parse the post in the request, trying at: http://localhost:8054/post.htm
      .post("post.htm", function(req, res) {
        res.writeHead(200, {"Content-Type": "text/html"});
        //With session support: "{session: true}"
        res.write("You username is " + req.session.get("username"));
        res.write('<form action="" method="post"><input name="input" /></form><br/>');
        res.end('Received : ' + req.body);
      }, {session: true});


Multi-instance support
--------------
Start a https server, make sure that the port will no conflict with others.

    var httpsSvr = new WebSvr({
        root: "./"

      //disable http server
      , port:      null

      //enable https server
      , httpsPort: 8443
      , httpsKey:  require("fs").readFileSync("svr/cert/privatekey.pem")
      , httpsCert: require("fs").readFileSync("svr/cert/certificate.pem")

      //, defaultPage: "index.htm"
      , listDir: true

      //Change the default locations of tmp session and upload files
      //session file stored here
      , sessionDir: "tmp/session/"
      //tempary upload file stored here
      , uploadDir:  "tmp/upload/"
    }).start();

Do you want to re-use the filters & handlers?

    httpsSvr.filters   = webSvr.filters;
    httpsSvr.handlers  = webSvr.handlers;




























node-websvr
====
基于NodeJS的一个极简Web服务器, 专为ARM设计。
假设嵌入式设备需要保持长时间稳定运行，当遇到问题时也可自动重启并恢复此前用户的Session会话。