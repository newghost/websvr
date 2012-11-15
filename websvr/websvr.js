/*Global.js*/
/*
* Description: WebSvr
* Author: Kris Zhang
* Lincense: MIT, GPL
* Included Projects:
- Formidable: Support uploading files, integrate
  https://github.com/felixge/node-formidable/
- Formidable: Support uploading files, integrate
  https://github.com/felixge/node-formidable/
- Underscore: Add underscore a utility-belt library for JavaScript
  https://github.com/documentcloud/underscore
- MIME: content-type in header
  https://github.com/broofa/node-mime
- template: Template Engine
  https://github.com/olado/doT
*/

//Node library
var fs      = require("fs");
var path    = require("path");
var qs      = require("querystring");

//Open source library
var _       = require("./lib/underscore");
var mime    = require("./lib/mime")
/*Settings.js*/
/*
Configurations
*/
var Settings = {
  //root folder of web
  root: "../",

  //list files in directory
  listDir: false,

  //http
  http: true,
  //default port of http
  port: 8054,

  //enable debug information output
  debug: false,
  //receive buffer,  default size 32k, i.e.: receive post data from ajax request
  bufferSize: 32768,

  //https
  https: false,
  //default port of https
  httpsPort: 8443,
  httpsOpts: { key:"", cert:"" },

  //logger file path
  logger:     "./tmp/log.txt",

  //session file stored here
  sessionDir: "./tmp/session",
  /*
  Session timeout, in milliseconds.
  When session is expired, session file will not deleted.
  */
  sessionAge: 1440000,
  /*
  Session garbage collection time, in milliseconds.
  When session expired time is more than (sessionAge + sessionGCT),
  then session file will be deleted.
  */
  sessionGCT: 3460000,

  //tempary upload file stored here
  uploadDir:  "./tmp/upload"
};

/*Logger.js*/
/*
Logger: log sth
*/
var Logger = (function(){

  var lineSeparator = "\r\n",
      indentSeparator = "\t",
      depth = 9;

  var log = function(logObj){

    var output = new Date() + lineSeparator;

    function print(pre, obj){
      if(!obj) return;
      for(var key in obj){
        output = output + pre + key + " : " + obj[key] + lineSeparator;
        if(typeof obj[key] == "object"){
          (pre.length < depth) && print(pre + indentSeparator, obj[key]);
        }
      }
    }

    print(indentSeparator, logObj);

    fs.appendFile(Settings.logger, output, function(err){
      console.log(err);
    });
  };

  return { log: log };

})();
/*ref\Math.uuid.js*/
/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

/*
 * Generate a random uuid.
 *
 * USAGE: Math.uuid(length, radix)
 *   length - the desired number of characters
 *   radix  - the number of allowable values for each character.
 *
 * EXAMPLES:
 *   // No arguments  - returns RFC4122, version 4 ID
 *   >>> Math.uuid()
 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
 *
 *   // One argument - returns ID of the specified length
 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
 *   "VcydxgltxrVZSTV"
 *
 *   // Two arguments - returns ID of the specified length, and radix. (Radix must be <= 62)
 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
 *   "01001010"
 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
 *   "47473046"
 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
 *   "098F4D35"
 */
(function() {
  // Private array of chars to use
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

  Math.uuid = function (len, radix) {
    var chars = CHARS, uuid = [], i;
    radix = radix || chars.length;

    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }

    return uuid.join('');
  };

  // A more performant, but slightly bulkier, RFC4122v4 solution.  We boost performance
  // by minimizing calls to random()
  Math.uuidFast = function() {
    var chars = CHARS, uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('');
  };

  // A more compact, but less performant, RFC4122v4 solution:
  Math.uuidCompact = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
})();

/*Mapper.js*/
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
  */
  match: function(req) {
    var self = this,
        expression = self.expression;

    //No expression? It's a general filter mapper
    if (!expression) return true;

    switch (expression.constructor) {
      case String: return req.url.indexOf(expression) > -1;
      case RegExp: return expression.test(req.url);
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
/*BodyParser.js*/
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
/*SessionManager.js*/
/*
SessionManager:
- Clear expired session files
- Valid session
*/
var SessionManager = (function() {

  //duration time
  var gcTime = Settings.sessionAge + Settings.sessionGCT;

  //timer
  var timer;

  //session array object, stored with {sid: [update time]};
  var list = {};

  var getPath = function(sid) {
    return path.join(Settings.sessionDir, sid);
  };

  //remove a sesson from list
  var remove = function(sid) {
    //delete the file
    fs.unlink(getPath(sid));
    //remove from list
    delete list[sid];

    console.log("session removed", sid);
  };

  /*
  Does session expired?
  This session is not in the manage list, add to the list, and treate it as not expired
  i.e. The WebSvr is restarted, the session list maybe empty
  */
  var isValid = function(sid) {
    var now  = new Date();

    !list[sid] && (list[sid] = now);

    return now - list[sid] <= Settings.sessionAge
  };

  /*
  
  */
  var clean = function() {
    for (var sid in list) {
      !isValid(sid) && remove(sid);
    }
  };

  //update session in list
  var update = function(sid, datetime) {
    isValid(sid) && (list[sid] = datetime || new Date());
  };

  var stop = function() {
    clearInterval(timer);
    timer = null;
  };

  //stop before new session start
  var start = function() {
    stop();
    timer = setInterval(clean, gcTime);
  };

  //start by default
  start();

  return {
    list:   list,
    update: update,
    remove: remove,
    isValid: isValid,
    getPath: getPath,
    start:  start,
    stop:   stop
  }

})();
/*SessionParser.js*/
/*
Parse request with session support
*/
//TODO: Need a child process of clear session
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
    (idx >= 0) && (sidVal = cookie.substring(idx + 6, idx + 38));

    //Sid doesn't exist, create it
    if (idx < 0 || sidVal.length != 32) {
      sidVal = Math.uuid(32);
      res.setHeader("Set-Cookie", " _wsid=" + sidVal + "; path=/");
      self.new  = true;
    };
    self.sid = sidVal;

    SessionManager.update(self.sid);
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
          console.log(err);
          return;
        }

        cb && cb(self.obj);
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
            console.log(err);
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
/*Parser.js*/
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
    if (mapper.parse && typeof req.body == "undefined") {
      //Must parser the request first, or the post data will lost;
      BodyParser(req, res, function(data) {
        req.body = data;
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
      var formidable = require('./lib/incoming_form'),
          form = new formidable.IncomingForm();

      form.uploadDir = Settings.uploadDir;

      form.parse(req, function(err, fields, files) {
        if (err) {
          console.log(err);
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

/*Filter.js*/
/*
Http Filter: Execute all the rules that matched,
Filters will be always called before a handler. 
*/
var Filter = {
  //filter list
  filters: [],
  
  /*
  filter: add a new filter
  expression: string/regexp [optional]
  handler:    function      [required]
  options:    object        [optional]
  */
  filter: function(expression, handler, options) {
    //The first parameter is Function => (handler, options)
    if (expression.constructor == Function) {
      options = handler;
      handler = expression;
      expression = null;
    }

    var mapper = new Mapper(expression, handler, options);
    Filter.filters.push(mapper);
  },

  /*
  file receiver: it's a specfic filter,
  this filter should be always at the top of the filter list
  */
  file: function(expression, handler, options) {
    var mapper = new Mapper(expression, handler, {file: true}); 
    //insert at the top of the filter array
    Filter.filters.splice(0, 0, mapper);
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
      console.log("filter matched", self.idx, mapper.expression, req.url);

      //filter matched, parse the request and then execute it
      Parser(req, res, mapper);
    }else{
      //filter not matched, validate next filter
      self.next();
    }
  }
};
/*Handler.js*/
/*
Http Handler: Execute and returned when when first matched;
At the same time only one Handler will be called;
*/
var Handler;

(function() {

  /*
  Private: handler list
  */
  var handlers = [];

  /*
  Static Handler instance
  */
  Handler = {
    /*
    url: add a new handler
    expression: string/regexp [required]
    handler:    [many types]  [required]
    options:    object        [optional]
    */
    url: function(expression, handler, options) {
      var mapper = new Mapper(expression, handler, options);
      handlers.push(mapper);
    },

    //Post: Parse the post data by default;
    post: function(expression, handler, options) {
      this.url(expression, handler, _.extend({ parse: true }, options));
    },

    //Session: Parse the session and post by default;
    session: function(expression, handler) {
      this.url(expression, handler, { parse: true, session: true });
    },

    handle: function(req, res) {
      //flag: is matched?
      for(var i = 0, len = handlers.length; i < len ; i++) {

        var mapper = handlers[i];
        if (mapper.match(req)) {

          console.log("handler matched", i, mapper.expression, req.url);

          var handler = mapper.handler,
              type = handler.constructor.name;

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

}());




/*ListDir.js*/
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
          console.log(err);
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
                console.log(err);
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
/*Template.js*/
/*
* Templates
*/
var Template = (function() {

  var engine  = require("./lib/doT");

  //get a file
  var getFile = function(filename, cb){
    var fullpath = path.join(Settings.root, filename);

    fs.readFile(fullpath, function (err, html) {
      err && console.log(err);
      err ? cb("") : cb(html);
    });
  };

  //render a file
  var render = function(chrunk, params, outFn){
    try {
      tmplFn = engine.compile(chrunk, params);
      outFn(tmplFn(params));
    } catch(err) {
      console.log(err);
      outFn(err);
    }
  };

  return {
    //render templates
    render: function(chrunk, params) {
      var res = this,
          end = res.end;

      var url = chrunk.url,
          con = chrunk.constructor;

      //It's a http request (it has "url")
      if (url) { 
        getFile(url, function(tmpl) {
          render(tmpl, params, end);
        });
      
      //It's html contents (template codes)
      } else if (con == String) {
        render(chrunk, params, end);

      //It's Array object (template file path)
      } else if (con == Array) {
        getFile(chrunk[0], function(tmpl) {
          render(tmpl, params, end);
        });

      //Nothing matched end the response
      } else {
        end();
      }

    }
  }

}());
/*Server.js*/
/*
* Description: Create a Web Server
* Author: Kris Zhang
* Licenses: MIT, GPL
*/
/*
* Define and Export WebSvr
*/
var WebSvr = module.exports = (function() {

  var server = function(options) {

    //Parameters
    //Count: How many files?
    var self = this,
        root,
        port;

    var fileHandler = function(req, res) {

      var url = req.url,
          hasQuery = url.indexOf("?");

      //fs.stat can't recognize the file name with querystring;
      url = hasQuery > 0 ? url.substring(0, hasQuery) : url;

      var fullPath = path.join(root, url);

      fs.stat(fullPath, function(err, stat) {

        //Consider as file not found
        if (err) return self.write404(res);

        //Is file? Open this file and send to client.
        if (stat.isFile()) {
          writeFile(res, fullPath);
        }

        //Is Directory? List all the files and folders.
        else if (stat.isDirectory()) {
          options.listDir
            ? ListDir.list(req, res, fullPath)
            : self.write403(res);
        }

      });
    };

    var requestHandler = function(req, res) {
      //Response may be shutdown when do the filter, in order not to cause exception,
      //Rewrite the write/writeHead functionalities of current response object
      var endFn = res.end;
      res.end = function() {
        //Execute old end
        endFn.apply(res, arguments);
        //Rewirte write/writeHead on response object
        res.write = res.writeHead = function() {
          console.log("response is already end, response.write ignored!")
        };
      };

      res.writeFile = function(filePath, cb) {
        self.writeFile(res, filePath, cb);
      };

      res.redirect = function(url, status) {
        res.writeHead(status ? status : 302, { "Location": url });
        res.end();
      };

      //render template objects
      res.render = Template.render;

      //initial httprequest
      var filterChain = new FilterChain(function(){

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
          console.log(err);
          return;
        }
        res.writeHead(200, { "Content-Type": mime.lookup(fullPath) });
        res.end(data, "binary");
      });
    };

    //Explose API
    //Filter
    self.filter = Filter.filter;
    self.file = Filter.file;

    //Handler
    self.url = Handler.url;
    self.post = Handler.post;
    self.session = Handler.session;

    //Logger
    self.log = Logger.log;

    //Get a fullpath of a request
    self.getFullPath = function(filePath) {
      return path.join(root, filePath);
    };

    //Write file, filePath is relative path
    self.writeFile = function(res, filePath, cb) {
      filePath = path.join(root, filePath);
      fs.exists(filePath, function(exist) {
        if (exist) {
          writeFile(res, filePath);
          cb && cb(exist);
        }else{
          //If callback function doesn't exist, write 404 page;
          cb ? cb(exist) : self.write404(res);
        }
      });
    };

    //TODO: Support 301 move permanently

    //TODO: Support 304 client-side cache

    self.write403 = function(res) {
      res.writeHead(403, {"Content-Type": "text/html"});
      res.end("Access forbidden!");
    };

    self.write404 = function(res) {
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end("File not found!");
    };

    //Public: start http server
    self.start = function() {
      //Update the default value of Settings
      options = _.extend(Settings, options);

      root = options.root;
      port = parseInt(options.port);

      //Create http server
      if (options.http) {
        var httpSvr = require("http").createServer(requestHandler);
        httpSvr.listen(port);

        console.log("Http server running at"
          ,"Root:", root
          ,"Port:", port
        );

        self.httpSvr = httpSvr;
      }

      //Create https server
      if (options.https) {
        var httpsOpts = options.httpsOpts,
            httpsPort = options.httpsPort;

        var httpsSvr = require("https").createServer(httpsOpts, requestHandler);
        httpsSvr.listen(httpsPort);

        console.log("Https server running at"
          ,"Root:", root
          ,"Port:", httpsPort
        );

        self.httpsSvr = httpsSvr;
      }

      //diable console.log information
      if (!options.debug) {
        console.log = function(){};
      }
    };

    //Public: close http server;
    self.close = function() {
      self.httpSvr && self.httpSvr.close();
      self.httpsSvr && self.httpsSvr.close();
    };

  };

  return server;

})();
