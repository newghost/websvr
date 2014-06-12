/*
* Description:  websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/node-websvr
*/

"use strict";

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
    if (!obj) return tar;

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
	//enable cache of template/include file (when enabled templates will not be refreshed before restart)
    , templateCache: true

    //default pages, only one is supported
    , defaultPage: "index.html"
    , 404:         ""

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

    //session domain
    , sessionDomain: ''

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

    var receives = [];

    req.on('data', function(chunk) {
      receives.push(chunk);
    });

    req.on('end', function() {
      callback(Buffer.concat(receives).toString());
    });
  };

  /*
  Parse request with session support
  */
  var SessionParser = function(req, res) {
    var self = this;

    //session id
    self.sid = null;
    //init session object
    self.init(req, res);
  };

  SessionParser.prototype = {
    init: function(req, res) {
      var self   = this
        , sidKey = "_wsid"
        , sidVal
        , sidStr
        ;

      //Get or Create sid, sid exist in the cookie, read it
      var sidVal = req.cookies[sidKey];

      //Sid doesn't exist, create it
      if (!sidVal || sidVal.length != 25 || !SessionManager.isValid(sidVal)) {
        sidVal = SessionManager.create();
        sidStr = " _wsid=" + sidVal + "; path=/";
        Settings.sessionDomain && (sidStr += "; domain=" + Settings.sessionDomain);

        res.setHeader("Set-Cookie", sidStr);
      };
      self.sid = sidVal;

      SessionManager.refresh(self.sid);
    }

    //Set an key/value pair in session object
    , set: function(key, val, cb) {
      var self = this;
      SessionManager.set(self.sid, key, val, cb);
    }

    //Get value from session file
    , get: function(key, cb) {
      var self = this
        , val;

      //The first parameter is callback function
      if (key.constructor == Function) {
        cb  = key;
        key = null;
      }
      val = SessionManager.get(self.sid, key);
      cb && cb(val);

      return val;
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

    /*
    parse cookie in request
    */
    var parseCookies = function() {
      var cookie  = req.headers.cookie
        , cookies = {}
        ;

      if (cookie) {
        var cookieArr = cookie.split(';');

        for (var i = 0; i < cookieArr.length; i++) {
          var strCookie = cookieArr[i]
            , idx       = strCookie.indexOf('=')
            ;
          idx > 0 && (cookies[strCookie.substr(0, idx).trim()] = strCookie.substr(idx + 1).trim());
        }
      }

      req.cookies = cookies;
      parseFile();
    };

    parseCookies();
  };

  /*
  SessionManager:
  - Clear expired session files
  - Valid session
  */
  var SessionManager = (function() {

    //duration time
    var gcTime
      , timer;

    /*
    * session array object, alls: stored sessions and updated time
    * etc:
        {
          sid: {
            ....
            __lastAccessTime: dateObject
          }
        }
    */
    var list = {};

    /*
    Init the sessions, load into session pool
    */
    var init = function() {
      gcTime = Settings.sessionTimeout + Settings.sessionGarbage;

      Logger.debug('Session Dir (gc time):', Settings.sessionDir, gcTime);

      fs.readdir(Settings.sessionDir, function(err, files) {
        if (err) return Logger.debug(err);

        //converted to minutes
        var expire = (+new Date() - gcTime) / 60000 | 0;

        files.forEach(function(file) {
          if (file.length == 25) {
            var stamp       = parseInt(file.substr(0, file.indexOf('-')))
              , sessionPath = SessionManager.getPath(file);

            if (stamp) {
              //remove the expired session
              if (stamp < expire) {
                remove(file);
              } else {
                fs.readFile(sessionPath, function(err, data) {
                  if (err) {
                    Logger.debug(err);
                    return;
                  }

                  try {
                    list[file] = JSON.parse(data);
                  } catch (e) {
                    Logger.debug(e);
                  }
                });
              }
            }
          }
        });
      });
    };

    var getPath = function(sid) {
      return path.join(Settings.sessionDir, sid);
    };

    //create a new session id
    var create = function() {
      /*
      * (Time stamp - [random character ...]).length = 25
      */
      var id = (+new Date()).toString('32') + '-'; 
      for (var i = id.length; i < 25; i++ ) {
        id += String.fromCharCode((Math.random() * 26 | 0) + 97);  /* a-z: 0~26; a = 97 */
      }

      list[id] = {};
      update(id);

      return id;
    };

    //force update session in list, convert to big int
    var update = function(sid, datetime) {
      list[sid].__lastAccessTime = +Date.parse(datetime) || +new Date();
    };

    //remove a sesson from list
    var remove = function(sid) {
      //delete the file
      fs.unlink(getPath(sid), function(err) {
        Logger.debug("unlink session file err", err);
      });
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
      return list[sid] && ((new Date() - list[sid].__lastAccessTime) || 0 <= Settings.sessionTimeout);
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

    /*
    * refresh session in list valid first,
    * if not expired update the time
    * if not exist create new one
    */
    var refresh = function(sid, datetime) {
      if (!list[sid]) {
        list[sid] = {};
        update(sid, datetime);
      } else {
        isValid(sid) && update(sid, datetime);  
      }      
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

    var get = function(sid, key) {
      var session = list[sid] || {};

      if (!isValid(sid)) {
        return '';
      }
      update(sid);
      return key ? session[key] : session;
    };

    var set = function(sid, key, val, cb) {
      var session = list[sid] || {};
      session[key] = val;

      if (!isValid(sid)) {
        return;
      }

      //force update
      update(sid);
      fs.writeFile(getPath(sid), JSON.stringify(session), function(err) {
        if (err) {
          Logger.debug(err);
        }

        cb && cb(session);
      });
    };

    init();

    return {
        init:     init
      , list:     list
      , create:   create
      , update:   update
      , remove:   remove
      , refresh:  refresh
      , isValid:  isValid
      , getPath:  getPath
      , clean:    clean
      , start:    start
      , stop:     stop
      , get:      get
      , set:      set
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
    Filter  : Match any section of the request url,          e.g., websvr.filter(".svr", cb);
    Handler : Match from the begining but it can bypass '/', e.g., websvr.handle("root/login", cb) or websvr.handle("/root/login")
    */
    match: function(req, isHandler) {
      var self        = this
        , reqUrl      = req.url
        , expression  = self.expression
        ;

      //No expression? It's a general filter mapper
      if (!expression) return true;

      switch (expression.constructor) {
        //String handler must start with root path, but it can bypass '/'
        case String:
          return self.matchString(req, isHandler, expression);
        case RegExp: return expression.test(reqUrl);
        case Array:
          for (var i = 0, l = expression.length; i < l; i++) {
            if (self.matchString(req, isHandler, expression[i])) {
              return true;
            }
          }
          return false;
      }

      return false;
    },

    /*
    Handle string expression like: /login/:username  or /userinfo/
    */
    matchString: function(req, isHandler, expression) {
      var reqUrl = req.url;

      //Pure string without params
      if (expression.indexOf('/:') < 0) {
        var idx = reqUrl.indexOf(expression);
        return isHandler ? (idx == 0 || idx == 1) : (idx > -1);
      //Handle and pickup params
      } else {
        var params = this.parseUrl(expression, reqUrl);
        params && _.extend(req.params, params);
        return params;
      }
    },

    /*
    * Pickup the params in the request url
    * expression = /home/:key/:pager
    *   /home/JavaScript => { id: 'JavaScript', pager: '' }
    *   /key/JavaScript  => false 
    */
    parseUrl: function(expression, reqUrl) {
      //Remove the params in querystring
      var idx = reqUrl.indexOf('?');
      idx > 0 && (reqUrl = reqUrl.substr(0, idx));

      var parts   = expression.split('/')
        , start   = expression.charAt(0) === '/' ? 0 : 1
        , urls    = reqUrl.split('/')
        , params  = {}
        ;

      for (var i = 0, l = parts.length; i < l; i++) {
        var part  = parts[i]
          , url   = urls[i + start]
          ;

        if (part.charAt(0) === ':') {
          params[part.substr(1)] = decodeURIComponent(url) || '';
        } else if (part != url) {
          return false;
        }
      }

      return params;
    },

    /*
    Add optional parameters on current mapper
    i.e:
    session:  boolean
    file:     boolean
    parse:    boolean
    */ 
    extend: function(options) {
      for(var key in options) {
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

      return this;
    }

    /*
    file receiver: it's a specfic filter,
    this filter should be always at the top of the filter list
    */
    , file: function(expression, handler, options) {
      var mapper = new Mapper(expression, handler, {file: true}); 
      //insert at the top of the filter array
      Filter.filters.splice(0, 0, mapper);

      return this;
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
      var self = this
        , req  = self.req
        , res  = self.res
        ;

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
      } else {
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

    //Caching of template files.
    var templatePool    = {}
      , includeRegExp   = /<!--#include="[\w\.]+"-->/g
      , includeBeginLen = 14
      , includeAfterLen = 4
      ;

    //default engine and defaultModel (e.g., define global footer/header in model)
    var engineFunc    = require("dot").compile
      , defaultModel  = null
      ;

    //get a file
    var getFile = function(filename, cb) {
      var fullpath = path.join(Settings.root, filename);

      //if template cache enabled, get from cache pool directly
      if (Settings.templateCache && templatePool[filename]) {
        cb && cb(templatePool[filename]);
      } else {
        fs.readFile(fullpath, function(err, tmpl) {
          if (err) {
            Logger.debug(err);
            cb && cb("");
          } else {
            tmpl = tmpl.toString();
            templatePool[filename] = tmpl;
            Logger.debug('update template cache', filename);
            cb && cb(tmpl);
          }
        });
      }
    };

    var getTemplate = function(filename, cb) {
      getFile(filename, function(tmpl) {
        /*
        find and update all the include files,
        will get templates from cache for making the process easier,
        the first refresh will not work, need some time to update the cache pool
        */
        tmpl = tmpl.replace(includeRegExp, function(fileStr) {
          var includeFile = fileStr.substring(includeBeginLen, fileStr.length - includeAfterLen);
          getFile(includeFile);
          return templatePool[includeFile] || '';
        });

        cb(tmpl);
      });
    };

    //render a file
    var render = function(chrunk, model, outFn) {
      var params
        , tmplFn;

      if (defaultModel) {
        params = Object.create(defaultModel);
        _.extend(params, model);
      } else {
        params = model;
      }

      try {
        tmplFn = engineFunc(chrunk);
        outFn(tmplFn(params));
      } catch(err) {
        Logger.debug(err);
        outFn(JSON.stringify(err));
      }
    };

    return {
        //render templates
        render: function(tmplUrl, model, outFn) {
          var res = this,
              end = outFn || res.end;

          if (arguments.length == 1) {
            model   = tmplUrl;
            tmplUrl = res.req.url;

            tmplUrl.indexOf('?') > -1 && (tmplUrl = tmplUrl.substr(0, tmplUrl.indexOf('?')));
          }

          getTemplate(tmplUrl, function(tmpl) {
            render(tmpl, model, end);
          });
        }
      , engine: function(_engineFunc) {
          engineFunc = _engineFunc;
        }
      , model: function(_model) {
          defaultModel = _model;
        }
    }
  }());


  /*****************Web initial codes*************/
  //Parameters
  var root;

  var fileHandler = function(req, res) {

    var url       = req.url
      , hasQuery  = url.indexOf("?")
      ;

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

      //If Content-Type is undefined, using text/html as default
      !res.headersSent && !res.getHeader('Content-Type') && res.setHeader("Content-Type", "text/html");

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

    //params in the matched url
    req.params = {};

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
  //Mapper
  self.parseUrl = Mapper.prototype.parseUrl;

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
  self.render   = Template.render;
  self.engine   = Template.engine;
  self.model    = Template.model;

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
    var tmpl404 = Settings["404"];

    res.writeHead(404, {"Content-Type": "text/html"});

    tmpl404
      ? res.render(tmpl404, null)
      : res.end("File not found!");

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