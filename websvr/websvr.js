/*
* Description:  websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/node-websvr
*/

//Node libraries
var fs      = require("fs");
var path    = require("path");
var qs      = require("querystring");
var os      = require("os");

var http    = require("http");
var https   = require("https");

//Open source libraries, some device may not have npm, so reference directly.
var mime        = require("mime");
var formidable  = require("formidable");

/*
* Utility
*/
var _ = {
  //extend object to target
  extend: function(tar, obj) {
    if (!obj) return;

    for (var key in obj) {
      tar[key] = obj[key];
    }

    return tar;
  }
};

//Shortcuts
var define = Object.defineProperty;


/*
* Define and Export WebSvr
*/
var WebSvr = module.exports = function(options) {

  var self = {};

  /*****************Web module definitions*************/
  /*
  Configurations
  */
  var Settings = {
    //root folder of web
    root: "../"

    //http start
    //default port of http
    , port: 8054

    //default port of https
    , httpsPort:  8443
    , httpsKey:   ""
    , httpsCert:  ""

    //list files in directory
    , listDir: false
    //enable client-side cache(304)
    , cache: true
    //enable debug information output
    , debug: true
    //receive buffer,  default size 255Kb, etc: receive post data from ajax request
    , bufferSize: 261120

    //default pages, only one is supported
    , defaultPage: "index.html"

    //logger file path
    , logger:     os.tmpDir() + "/log.txt"

    /*
    Session timeout, in milliseconds.
    When session is expired, session file will not deleted.
    */
    , sessionTimeout: 1440000
    /*
    Session garbage collection time, in milliseconds.
    When session expired time is more than (sessionAge + sessionGCT),
    then session file will be unlinked.
    */
    , sessionGarbage: 3460000

    //session file stored here
    , sessionDir: os.tmpDir()

    //tempary upload file stored here
    , uploadDir:  os.tmpDir()
  };

  /*
  Logger: log sth
  */
  var Logger = (function() {

    var lineSeparator   = "\r\n",
        indentSeparator = "\t",
        depth = 9;

    var write = function(logObj, dep) {
      var depth   = dep || depth,
          output  = new Date() + lineSeparator;

      function print(pre, obj) {
        if (!obj) return;
        for (var key in obj) {
          var val = obj[key];
          output = output + pre + key + " : " + val + lineSeparator;
          if (typeof val == "object") {
            (pre.length < depth) && print(pre + indentSeparator, val);
          }
        }
      }

      print(indentSeparator, logObj);

      fs.appendFile(Settings.logger, output, function(err) {
        log(err);
      });
    };

    /*
    Currnetly it's equal to console.log
    */
    var log = function() {
      console.log.apply(console, arguments);
    };

    /*
    Add data before log information
    */
    var debug = function() {
      //diable console.log information
      if (!Settings.debug) {
        return;
      }

      var d = new Date().toString();

      Array.prototype.splice.call(arguments, 0, 0, d.substr(0, d.indexOf(" GMT")));
      console.log.apply(console, arguments);
    };

    return { 
        log:    log
      , write:  write
      , debug:  debug
    };
  })();

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

  /*
  Parse request with session support
  */
  var SessionParser = function(req, res) {
    var self = this;

    //session id
    self.sid = null;
    //session stored object
    self.obj = null;
    //is this new session?
    self.new = false;

    //init session object
    self.init(req, res);
  };

  SessionParser.prototype = {
    init: function(req, res) {
      var self   = this,
          sidKey = "_wsid",
          sidVal;

      //Get or Create sid, sid exist in the cookie, read it
      var cookie = req.headers.cookie || "";
      var idx = cookie.indexOf(sidKey + "=");
      (idx >= 0) && (sidVal = cookie.substring(idx + 6, idx + 31));

      //Sid doesn't exist, create it
      if (idx < 0 || sidVal.length != 25) {
        sidVal = SessionManager.create();
        res.setHeader("Set-Cookie", " _wsid=" + sidVal + "; path=/");
        self.new  = true;
      };
      self.sid = sidVal;

      SessionManager.refresh(self.sid);
    }

    //Create new session object
    , newObj: function(key, cb) {
      //Key is offered, return null of this key, else return empty session object
      var self = this,
          val = key ? null : {};

      self.obj = {};
      cb && cb(val);
      return val;
    }

    //Get value from session object
    , getVal: function(key, cb) {
      var self = this;

      //key is null, return all the session object
      var val = key ? self.obj[key] : self.obj;
      cb && cb(val);

      return val;
    }

    //Set an key/value pair in session object
    , set: function(key, val, cb) {
      var self = this;

      //Get session object first
      self.get(function() {

        //Add or update key/value in session object
        self.obj[key] = val;

        //Write or modify json file
        fs.writeFile(SessionManager.getPath(self.sid), JSON.stringify(self.obj), function(err) {
          if (err) {
            Logger.debug(err);
            return;
          }

          cb && cb(self.obj);

          //force update
          SessionManager.update(self.sid);
        });
      });
    }

    //Get value from session file
    , get: function(key, cb) {
      var self = this;

      //The first parameter is callback function
      if (key.constructor == Function) {
        cb  = key;
        key = null;
      }

      //The session object is already loaded
      if (self.obj) return self.getVal(key, cb);

      //It's a new session file, need not to load it from file
      if (self.new) return self.newObj(key, cb);

      var sessionPath = SessionManager.getPath(self.sid);

      //File operates, will cause delay
      fs.exists(sessionPath, function(exists) {
        //err: file doesn't exist
        if (!exists) {
          return self.newObj(key, cb);

        //session not expired
        } else if (SessionManager.isValid(self.sid)) {
          fs.readFile(sessionPath, function(err, data) {
            if (err) {
              Logger.debug(err);
              return;
            };
            data = data || "{}";
            self.obj = JSON.parse(data);

            return self.getVal(key, cb);
          });

        //session expired, treat it as new session
        } else {
          return self.newObj(key, cb);
        }
      });
    }
  };

  /*
  Parser: Functions that Filter and Handler will be called 
  */
  var Parser = function(req, res, mapper) {

    var handler = mapper.handler;

    //add sesion support
    var parseSession = function() {
      //add sesion support
      if (mapper.session && typeof req.session == "undefined") {
        req.session = new SessionParser(req, res);
      }
      handler(req, res);
    };

    /*
    parse data in request, this should be done before parse session,
    because session stored in file
    */
    var parseBody = function() {
      //need to parse the request?
      if ((mapper.parse || mapper.post) && typeof req.body == "undefined") {
        //Must parser the request first, or the post data will lost;
        BodyParser(req, res, function(data) {
          var body = data;

          //handle exception
          try {
            mapper.post == "json"
              && (body = JSON.parse(data || "{}"));

            mapper.post == "qs"
              && (body = qs.parse(data || ""));
          } catch(e) {
            body = {};
          }

          req.body = body;
          parseSession();
        });
      }else{
        parseSession();
      }
    };

    /*
    parse file in request, this should be at the top of the list
    */
    var parseFile = function() {
      //Need to parse the file in request?
      if (mapper.file && typeof req.body == "undefined") {
        //Must parser the request first, or the post data maybe lost;
        var form = new formidable.IncomingForm();

        form.uploadDir = Settings.uploadDir;

        form.parse(req, function(err, fields, files) {
          if (err) {
            Logger.debug(err);
            return;
          };

          //attach the parameters and files
          req.body  = fields;
          req.files = files;

          //in fact request will not be parsed again, because body is not undefined
          parseBody();
        });
      }else{
        parseBody();
      };
    };

    parseFile();
  };

  /*
  SessionManager:
  - Clear expired session files
  - Valid session
  */
  var SessionManager = (function() {

    //duration time
    var gcTime = Settings.sessionTimeout + Settings.sessionGarbage;

    //timer
    var timer;

    //session array object, stored with {sid: [update time]};
    var list = {};

    var getPath = function(sid) {
      return path.join(Settings.sessionDir, sid);
    };

    //create a new session id
    var create = function() {
      //Time stamp, change interval is 18.641 hours, higher 6 bits will be kept, this is used for delete the old sessions
      var uuid 
        = ((+new Date()) / 60000 | 0)          //Time stamp, change interval is 1 min, 8 chars
        + '-'
        + ((Math.random() * 0x4000000 | 0))    //Random 1: Used for distinguish the session, max 8 chars
        + ((Math.random() * 0x4000000 | 0));   //Random 2: Used for distinguish the session, max 8 chars

      //fix the length to 25
      uuid += '00000000000000000000'.substr(0, 25 - uuid.length);

      return uuid;
    };

    //force update session in list
    var update = function(sid, datetime) {
      list[sid] = datetime || new Date();
    };

    //remove a sesson from list
    var remove = function(sid) {
      //delete the file
      fs.unlink(getPath(sid));
      //remove from list
      delete list[sid];

      Logger.debug("session removed", sid);
    };

    /*
    Does session expired?
    If the session is not in the list, add to the list.
    i.e. When WebSvr restarted, session will not expired.
    */
    var isValid = function(sid) {
      var now  = new Date();

      !list[sid] && (list[sid] = now);

      return now - list[sid] <= Settings.sessionTimeout
    };

    /*
    Session clean handler
    */
    var cleanHandler = function() {
      for (var sid in list) {
        !isValid(sid) && remove(sid);
      }
    };

    /*
    Clean the session in temp folder
    */
    var clean = function() {
      fs.readdir(Settings.sessionDir, function(err, files) {
        if (err) return Logger.debug(err);

        //converted to minutes
        var expire = (+new Date() - gcTime) / 60000 | 0;

        files.forEach(function(file) {
          if (file.length == 25) {
            var stamp = parseInt(file.substr(0, file.indexOf('-')));

            if (stamp) {
              //remove the expired session
              stamp < expire
                ? remove(file)
                : Logger.debug("session skipped", file);
            } 
          }
        });
      });
    };

    //refresh session in list, valid first, if not expired, update the time
    var refresh = function(sid, datetime) {
      isValid(sid) && update(sid, datetime);
    };

    var stop = function() {
      clearInterval(timer);
      timer = null;
    };

    //stop before new session start
    var start = function() {
      //stop cleanHandler if available
      stop();
      //clean the old sessions
      clean();
      timer = setInterval(cleanHandler, gcTime);
    };

    return {
      list:   list,
      create: create,
      update: update,
      remove: remove,
      refresh: refresh,
      isValid: isValid,
      getPath: getPath,
      clean: clean,
      start: start,
      stop:  stop
    }
  })();

  /*
  Mapper: Used for Filter & Handler,
  expression: required parameter
  handler:    required parameter
  options:    optional parameters
  */
  var Mapper = function(expression, handler, options) {
    var self = this;

    self.expression = expression;
    self.handler = handler;

    //Has other parameters?
    self.extend(options);
  };

  Mapper.prototype = {
    /*
    Does this mapper matched this request?
    Filter and Handler doesn't have the same matched rules when you passing a string
    Filter  : Match any section of the request url,          etc: websvr.filter(".svr", cb);
    Handler : Match from the begining but it can bypass '/', etc: websvr.handle("root/login", cb) or websvr.handle("/root/login")
    */
    match: function(req, isHandler) {
      var self = this,
          expression = self.expression;

      //No expression? It's a general filter mapper
      if (!expression) return true;

      switch (expression.constructor) {
        //String handler must start with root path, but it can bypass '/'
        case String:
          var idx = req.url.indexOf(expression);
          return isHandler ? (idx == 0 || idx == 1) : (idx > -1);
        case RegExp: return expression.test(req.url);
        case Array:
          for (var i = 0, l = expression.length; i < l; i++) {
            var idx = req.url.indexOf(expression[i])
              , tag = isHandler ? (idx == 0 || idx == 1) : (idx > -1);
            if (tag) return true;
          }
          return false;

      }

      return false;
    },

    /*
    Add optional parameters on current mapper
    i.e:
    session:  boolean
    file:     boolean
    parse:    boolean
    */ 
    extend: function(options) {
      for(key in options) {
        this[key] = options[key]
      }
    }
  };

  /*
  Http Filter: Execute all the rules that matched,
  Filter will be always called before a handler. 
  */
  var Filter = {
    //filter list
    filters: []
    
    /*
    filter: add a new filter
    expression: string/regexp [optional]
    handler:    function      [required]
    options:    object        [optional]
    */
    , filter: function(expression, handler, options) {
      //The first parameter is Function => (handler, options)
      if (expression.constructor == Function) {
        options = handler;
        handler = expression;
        expression = null;
      }

      var mapper = new Mapper(expression, handler, options);
      Filter.filters.push(mapper);

      return self;
    }

    /*
    file receiver: it's a specfic filter,
    this filter should be always at the top of the filter list
    */
    , file: function(expression, handler, options) {
      var mapper = new Mapper(expression, handler, {file: true}); 
      //insert at the top of the filter array
      Filter.filters.splice(0, 0, mapper);

      return self;
    }
  };

  /*
  Filter Chain
  */
  var FilterChain = function(cb, req, res) {
    var self = this;

    self.idx = 0;
    self.cb = cb;

    self.req = req;
    self.res = res;
  };

  FilterChain.prototype = {
    next: function() {
      var self = this,
          req  = self.req,
          res  = self.res;

      var mapper = Filter.filters[self.idx++];

      //filter is complete, execute callback;
      if (!mapper) return self.cb && self.cb();

      /*
      If not Matched go to next filter
      If matched need to execute the req.next() in callback handler,
      e.g:
      webSvr.filter(/expression/, function(req, res) {
        //filter actions
        req.next(req, res);
      }, options);
      */
      if (mapper.match(req)) {
        Logger.debug("filter matched", self.idx, mapper.expression, req.url);

        //filter matched, parse the request and then execute it
        Parser(req, res, mapper);
      }else{
        //filter not matched, validate next filter
        self.next();
      }
    }
  };

  /*
  Http Handler: Execute and returned when when first matched;
  At the same time only one Handler will be called;
  */
  var Handler = {
    handlers: []
    /*
    url: add a new handler
    expression: string/regexp [required]
    handler:    [many types]  [required]
    options:    object        [optional]
    */
    , url: function(expression, handler, options) {
      var mapper = new Mapper(expression, handler, options);
      Handler.handlers.push(mapper);

      return self;
    }

    //Post: Parse the post data by default;
    , post: function(expression, handler, options) {
      return this.url(expression, handler, _.extend({ parse: true }, options));
    }

    //Session: Parse the session and post by default;
    , session: function(expression, handler) {
      return this.url(expression, handler, { parse: true, session: true });
    }

    , handle: function(req, res) {
      //flag: is matched?
      for(var i = 0, len = Handler.handlers.length; i < len ; i++) {

        var mapper = Handler.handlers[i];
        //This is handler match
        if (mapper.match(req, true)) {

          Logger.debug("handler matched", i, mapper.expression, req.url);

          var handler = mapper.handler,
              type    = handler.constructor.name;

          switch(type) {
            //function: treated it as custom function handler
            case "Function":
              Parser(req, res, mapper);
              break;

            //string: treated it as content
            case "String":
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(handler);
              break;

            //array: treated it as a file.
            case "Array":
              res.writeFile(handler[0]);
              break;
          }
          return true;
        }
      }

      return false;

    }   //end of handle
  };

  /*
  ListDir: List all the files in a directory
  */
  var ListDir = (function() {

    var urlFormat = function(url) {
      url = url.replace(/\\/g,'/');
      url = url.replace(/ /g,'%20');
      return url;
    };

    //Align to right
    var date = function(date) {
      var d = date.getFullYear() 
        + '-' + (date.getMonth() + 1)
        + '-' + (date.getDay() + 1)
        + " " + date.toLocaleTimeString();
      return "                ".substring(0, 20 - d.length) + d;
    };

    //Align to left
    var size = function(num) {
      return num + "                ".substring(0, 12 - String(num).length);
    };

    //Create an anchor
    var anchor = function(txt, url) {
      url = url ? url : "/";
      return '<a href="' + url + '">' + txt + "</a>";
    };

    var listDir = {
      //List all the files in a directory
      list: function(req, res, dir) {
        var url = req.url,
            cur = 0,
            len = 0;

        var listBegin = function() {
          res.writeHead(200, {"Content-Type": "text/html"});
          res.write("<h2>http://" + req.headers.host + url + "</h2><hr/>");
          res.write("<pre>");
          res.write(anchor("[To Parent Directory]", url.substr(0, url.lastIndexOf('/'))) + "\r\n\r\n");
        };

        var listEnd = function() {
          res.write("</pre><hr/>");
          res.end("<h5>Count: " + len + "</h5>");
        };

        listBegin();

        fs.readdir(dir, function(err, files) {
          if (err) {
            listEnd();
            Logger.debug(err);
            return;
          }

          len = files.length;

          for(var idx = 0; idx < len; idx++) {
            //Persistent the idx before make the sync process
            (function(idx) {
              var filePath = path.join(dir, files[idx]),
                  fileUrl = urlFormat(path.join(url, files[idx]));

              fs.stat(filePath, function(err, stat) {
                cur++;

                if (err) {
                  Logger.debug(err);
                }else{
                  res.write(
                    date(stat.mtime)
                    + "\t" + size(stat.size)
                    + anchor(files[idx], fileUrl)
                    + "\r\n"
                  );
                }

                (cur == len) && listEnd();
              });
            })(idx);
          }

          (len == 0) && listEnd();
        });
      }
    };

    return listDir;
  }());

  /*
  * Template Engine
  */
  var Template = (function() {

    var engine  = require("dot");

    //get a file
    var getFile = function(filename, cb) {
      var fullpath = path.join(Settings.root, filename);

      fs.readFile(fullpath, function(err, html) {
        err && Logger.debug(err);
        err ? cb("") : cb(html);
      });
    };

    //render a file
    var render = function(chrunk, params, outFn) {
      try {
        tmplFn = engine.compile(chrunk, params);
        outFn(tmplFn(params));
      } catch(err) {
        Logger.debug(err);
        outFn(JSON.stringify(err));
      }
    };

    return {
        //render templates
        render: function(tmplUrl, model) {
          var res = this,
              end = res.end;

          if (arguments.length == 1) {
            model   = tmplUrl;
            tmplUrl = res.req.url;

            tmplUrl.indexOf('?') > -1 && (tmplUrl = tmplUrl.substr(0, tmplUrl.indexOf('?')));
          }

          getFile(tmplUrl, function(tmpl) {
            render(tmpl, model, end);
          });
        }
      , engine: function(engineLib) {
          engine = engineLib;
        }
    }
  }());


  /*****************Web initial codes*************/
  //Parameters
  var root;

  var fileHandler = function(req, res) {

    var url = req.url,
        hasQuery = url.indexOf("?");

    //fs.stat can't recognize the file name with querystring;
    url = hasQuery > 0 ? url.substring(0, hasQuery) : url;

    var fullPath = path.join(root, url);

    //Handle path
    var handlePath = function(phyPath) {
      fs.stat(phyPath, function(err, stat) {

        //Consider as file not found
        if (err) return self.write404(res);

        //Is file? Open this file and send to client.
        if (stat.isFile()) {
          // "If-modified-since" undefined, mark it as 1970-01-01 0:0:0
          var cacheTime = new Date(req.headers["if-modified-since"] || 1);

          // The file is modified
          if (Settings.cache && stat.mtime <= cacheTime) {
            res.writeHead(304);
            res.end();

          // Else send "not modifed"
          } else {
            res.setHeader("Last-Modified", stat.mtime.toUTCString());
            writeFile(res, phyPath);
          }
        }

        //Is Directory?
        else if (stat.isDirectory()) {
          handleDefault(phyPath);
        }

        //Or write the 404 pages
        else {
          self.write404(res);
        }

      });
    };

    //List all the files and folders.
    var handleDir = function(dirPath) {
      Settings.listDir
        ? ListDir.list(req, res, dirPath)
        : self.write403(res);
    };

    //Handle default page
    var handleDefault = function(dirPath) {
      var defaultPage = Settings.defaultPage;

      if (defaultPage) {
        var defaultPath = path.join(dirPath, defaultPage);

        fs.exists(defaultPath, function(exists) {
          //If page exists hanle it again
          if (exists) {
            //In order to make it as a dir path for loading static resources
            if (url[url.length - 1] != '/') {
              return res.redirect(url + '/');
            }

            handlePath(defaultPath);
          //If page doesn't exist hanlde the dir again
          } else {
            handleDir(dirPath);
          }
        });
      } else {
        handleDir(dirPath);
      }
    };

    handlePath(fullPath);
  };

  var requestHandler = function(req, res) {
    //Make request accessible in response object
    res.req = req;

    //Response may be shutdown when do the filter, in order not to cause exception,
    //Rewrite the write/writeHead functionalities of current response object
    var endFn = res.end;
    res.end = function() {
      //Execute old end
      endFn.apply(res, arguments);
      //Rewirte write/writeHead on response object
      res.write = res.writeHead = res.setHeader = function() {
        Logger.debug("response is already end, response.write ignored!")
      };
    };

    //relative path, relative to the web root
    res.writeFile = function(filePath, cb) {
      self.writeFile(res, filePath, cb);
    };

    //absolute path, relative to the server running 
    res.sendFile = function(filePath, cb) {
      self.writeFile(res, filePath, cb, true)
    };

    //301/302 : move permanently
    res.redirect = function(url, status) {
      res.writeHead(status ? status : 302, { "Location": url });
      res.end();
    };

    //render template objects
    res.render = Template.render;

    //initial httprequest
    var filterChain = new FilterChain(function() {

      //if handler not match, send the request
      !Handler.handle(req, res) && fileHandler(req, res);

    }, req, res);

    //Hook FilterChain object on the request
    req.filter = filterChain;

    //Handle the first filter
    req.filter.next();
  };

  var writeFile = function(res, fullPath) {
    fs.readFile(fullPath, function(err, data) {
      if (err) {
        Logger.debug(err);
        return;
      }

      !res.getHeader("Content-Type")
        && res.setHeader("Content-Type", mime.lookup(fullPath));

      res.writeHead(200);
      res.end(data, "binary");
    });
  };

  //API have function chain
  //Filter
  self.filter   = Filter.filter;
  self.file     = Filter.file;

  //Handler
  self.get      = Handler.url;
  self.url      = Handler.url;
  self.handle   = Handler.url;
  self.handler  = Handler.url;
  self.post     = Handler.post;
  self.session  = Handler.session;
  self.settings = Settings;

  //Template
  self.engine   = Template.engine;

  //Get a full path of a request
  self.getFullPath = function(filePath) {
    return path.join(root, filePath);
  };

  //Write file, filePath is relative path
  self.writeFile = function(res, filePath, cb, isSvrPath) {
    !isSvrPath && (filePath = path.join(root, filePath));
    fs.exists(filePath, function(exist) {
      if (exist) {
        writeFile(res, filePath);
        cb && cb(exist);
      }else{
        //If callback function doesn't exist, write 404 page;
        cb ? cb(exist) : self.write404(res);
      }
    });

    return self;
  };

  self.write403 = function(res) {
    res.writeHead(403, {"Content-Type": "text/html"});
    res.end("Access forbidden!");

    return self;
  };

  self.write404 = function(res) {
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end("File not found!");

    return self;
  };

  //start http server
  self.start = function() {
    //Update the default value of Settings
    _.extend(Settings, options);

    root = Settings.root;

    //Create http server: Enable by default
    if (Settings.port) {
      var port = Settings.port;

      var httpSvr = http.createServer(requestHandler);
      httpSvr.listen(port);

      Logger.log("Http server running at"
        ,"Root:", root
        ,"Port:", port
      );

      self.httpSvr = httpSvr;
    }

    //Create https server: Disable by default
    if ( options.httpsPort
      && options.httpsKey
      && options.httpsCert) {

      var httpsPort = Settings.httpsPort;

      var httpsSvr = https.createServer({
        key:  Settings.httpsKey,
        cert: Settings.httpsCert
      }, requestHandler).listen(httpsPort);

      Logger.log("Https server running at"
        ,"Root:", root
        ,"Port:", httpsPort
      );

      self.httpsSvr = httpsSvr;
    }

    /*
    init modules
    */
    //Start session garbage collection
    SessionManager.start();

    return self;
  };

  //stop http server
  self.stop = function() {
    self.httpSvr  && self.httpSvr.close();
    self.httpsSvr && self.httpsSvr.close();
    SessionManager.stop();

    return self;
  };

  //property: filters & handlers
  define(self, 'filters', {
    get: function() { 
      return Filter.filters
    },
    set: function(filters) {
      Filter.filters = filters;
    }
  });

  define(self, 'handlers', {
    get: function() {
      return Handler.handlers;
    },
    set: function(handlers) {
      Handler.handlers = handlers;
    }
  });

  return self;

};