//import WebSvr module
var WebSvr = require("../../websvr/websvr");

//Start the WebSvr, runnting at parent folder, default port is 8054, directory browser enabled;
//Trying at: http://localhost:8054
var webSvr = WebSvr({
    home: "./web"
  , listDir:  true
  , debug:    true
  , sessionTimeout: 60 * 1000
});

/*
General filter: parse the post data / session before all request
  parse:   parse the post data and stored in req.body;
  session: init the session and stored in req.session; 
*/
webSvr.filter(function(req, res) {

  //Link to next filter
  req.filter.next();

}, {session:true});

/*
Session Filter: protect web/* folder => (validation by session);
*/
webSvr.filter(function(req, res) {
  //It's not index.htm/login.do, do the session validation
  if (req.url.indexOf("login.htm") < 0 && req.url.indexOf("login.do") < 0 && req.url !== '/') {
    //Once session is get initialized
    //TODO: Make sure next req.session.get() will not load session file again.
    var val = req.session.get("username");

    console.log("session username:", val);
    !val && res.end("You must login, first!");

    //Link to next filter
    req.filter.next();
  } else {
    req.filter.next();
  }
});


/*
Handler: login.do => (validate the username & password)
  username: admin
  password: 12345678
*/
webSvr.url("login.do", function(req, res) {
  var qs = req.body;
  console.log(qs);
  if (qs.username == "admin" && qs.password == "12345678") {
    //Put key/value pair in session
    var session = req.session.set("username", qs.username);
    console.log(session);
    res.redirect("setting.htm");
  } else {
    res.writeHead(401);
    res.end("Wrong username/password");
  }
}, 'qs');

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
});

/*
Template: render template with params
*/
webSvr.url("template.node", function(req, res) {
  webSvr.engine(require("dot").compile);

  res.writeHead(200, {"Content-Type": "text/html"});
  //render template with session: { "username" : "admin" }
  var session = req.session.get();
  res.render(session);
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
  .url("post.htm", function(req, res) {
    res.writeHead(200, {"Content-Type": "text/html"});
    //With session support: "{session: true}"
    res.write("You username is " + req.session.get("username"));
    res.write('<form action="" method="post"><input name="input" /></form><br/>');
    res.end('Received : ' + req.body);
  }, {session: true, post: true});


webSvr.post('post_qs', function(req, res) {
  res.end('Received : ' + JSON.stringify(req.body));
});


webSvr.post('post_json', function(req, res) {
  res.end('Received : ' + JSON.stringify(req.body));
}, 'json');


var httpsSvr = WebSvr({
    home: "./web"

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
});


httpsSvr.filters   = webSvr.filters;
httpsSvr.handlers  = webSvr.handlers;