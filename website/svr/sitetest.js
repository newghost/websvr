//import WebSvr module
var WebSvr = require("websvr");

//Start the WebSvr, runnting at parent folder, default port is 8054, directory browser enabled;
//Trying at: http://localhost:8054
var webSvr = new WebSvr({
    root: "./web"
  , listDir:  true
  , debug:    true
}).start();

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

/*
Session Filter: protect web/* folder => (validation by session);
*/
webSvr.filter(/web\/[\w\.]+/, function(req, res) {
  //It's not index.htm/login.do, do the session validation
  if (req.url.indexOf("index.htm") < 0 && req.url.indexOf("login.do") < 0) {
    //Once session is get initialized
    //TODO: Make sure next req.session.get() will not load session file again.
    req.session.get("username", function(val) {
      console.log("session username:", val);

      !val && res.end("You must login, first!");

      //Link to next filter
      req.filter.next();
    });

  } else {
    req.filter.next();
  }
});


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
      res.redirect("setting.htm");
    });
  } else {
    res.writeHead(401);
    res.end("Wrong username/password");
  }
});

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

/*
Redirect: redirect request, try at: http://localhost:8054/redirect
*/
webSvr.url("redirect", function(req, res) {
  res.redirect("/svr/websvr.all.js");
});

/*
Template: define default template params
*/
webSvr.model({
    title   : "New Page"
  , username: "kris"
  , header  : require("fs").readFileSync("web/header.xml")
});

/*
Template: render template with params
*/
webSvr.url("template.node", function(req, res) {
  webSvr.engine(require("dot").compile);

  res.writeHead(200, {"Content-Type": "text/html"});
  //render template with session: { "username" : "admin" }
  req.session.get(function(session) {
    res.render(session);
  });
});

/*
Template: render template with jade
*/
webSvr.url("template.jade", function(req, res) {
  webSvr.engine(require("jade").compile);

  res.writeHead(200, {"Content-Type": "text/html"});
  res.render({
    pageTitle: "Testing Jade",
    maintainer: {
      name: 'Forbes Lindesay',
      twitter: '@ForbesLindesay',
      blog: 'forbeslindesay.co.uk'
    }
  });
});

/*
Simple redirect API:
*/
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

httpsSvr.filters   = webSvr.filters;
httpsSvr.handlers  = webSvr.handlers;