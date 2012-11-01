/*
* Description: Create a Web Server (http based).
* Author: Kris Zhang
*/
/*
* WebSvr Namespace
*/
var WebSvr = (function(){

  var defaults = {
    //Server port
    port: 8054,
    //Root path
    root: "./../web",
    session: false,
  };

  var server = function(options){
    //Library
    var fs = require("fs"),
      path = require("path"),
      mime = require("./lib/mime");

    //Parameters
    //Count: How many files?
    var self = this,
        root,
        port;

    var urlFormat = function(url){
      url = url.replace(/\\/g,'/');
      url = url.replace(/ /g,'%20');
      return url;
    };

    //Align to right
    var date = function(date){
      var d = date.getFullYear() 
        + '-' + (date.getMonth() + 1)
        + '-' + (date.getDay() + 1)
        + " " + date.toLocaleTimeString();
      return "                ".substring(0, 20 - d.length) + d;
    };

    //Align to left
    var size = function(num){
      return num + "                ".substring(0, 12 - String(num).length);
    };

    var anchor = function(txt, url){
      url = url ? url : "/";
      return '<a href="' + url + '">' + txt + "</a>";
    };

    var fileHandler = function(req, res){

      var url = req.url,
          hasQuery = url.indexOf("?");

      //Bug: path.join can't recognize the querystring;
      url = hasQuery > 0 ? url.substring(0, hasQuery) : url;

      var fullPath = path.join(root, url);

      fs.stat(fullPath, function(err, stat){

        //Consider as file not found
        if(err) return self.write404(res);

        //Is file? Open this file and send to client.
        if(stat.isFile()){
          writeFile(res, fullPath);
        }

        //Is Directory? List all the files and folders.
        else if(stat.isDirectory()){
          if(options.listDir){
            self.listDir(req, res, fullPath);
          }else{
            self.write403(res);
          }
        }

      });
    };

    var requestHandler = function(req, res){
      //Response may be shutdown when do the filter, in order not to cause exception,
      //Rewrite the write/writeHead functionalities of current response object
      var endFn = res.end;
      res.end = function(){
        //Execute old end
        endFn.apply(res, arguments);
        //Rewirte write/writeHead on response object
        res.write = res.writeHead = function(){
          console.log("response is already end, response.write ignored!")
        };
      };

      res.writeFile = function(filePath, cb){
        self.writeFile(res, filePath, cb);
      };

      //Define filter object
      req.filter = new FilterChain(function(){
        //if handler not match, send the request
        !Handler.handle(req, res) && fileHandler(req, res);
      });

      //Handle the first filter
      req.filter.next(req, res);
    };

    var writeFile = function(res, fullPath){
      fs.readFile(fullPath, function(err, data){
        if(err){
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

    //Get a fullpath of a request
    self.getFullPath = function(filePath){
      return path.join(root, filePath);
    };

    //List all the files in a directory
    self.listDir = function(req, res, dir){
      var url = req.url,
          cur = 0,
          len = 0;

      var listBegin = function(){
        res.writeHead(200, {"Content-Type": "text/html"});
        res.write("<h2>http://" + req.headers.host + url + "</h2><hr/>");
        res.write("<pre>");
        res.write(anchor("[To Parent Directory]", url.substr(0, url.lastIndexOf('/'))) + "\r\n\r\n");
      };

      var listEnd = function(){
        res.write("</pre><hr/>");
        res.end("<h5>Count: " + len + "</h5>");
      };

      listBegin();

      fs.readdir(dir, function(err, files){
        if(err){
          listEnd();
          console.log(err);
          return;
        }

        len = files.length;

        for(var idx = 0; idx < len; idx++){
          //Persistent the idx before make the sync process
          (function(idx){
            var filePath = path.join(dir, files[idx]),
                fileUrl = urlFormat(path.join(url, files[idx]));

            fs.stat(filePath, function(err, stat){
              cur++;

              if(err){
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
    };

    //Write file, filePath is relative path
    self.writeFile = function(res, filePath, cb){
      filePath = path.join(root, filePath);
      fs.exists(filePath, function(exist){
        if(exist){
          writeFile(res, filePath);
          cb && cb(exist);
        }else{
          //If callback function doesn't exist, write 404 page;
          cb ? cb(exist) : self.write404(res);
        }
      });
    };

    self.write403 = function(res){
      res.writeHead(403, {"Content-Type": "text/html"});
      res.end("Access forbidden!");
    };

    self.write404 = function(res){
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end("File not found!");
    };

    //Public: start http server
    self.start = function(){
      //Update the default value of Settings
      options = _.extend({}, Settings, options);

      root = options.root;
      port = parseInt(options.port);

      //Create http server
      if(options.http){
        var httpSvr = require("http").createServer(requestHandler);
        httpSvr.listen(port);

        console.log("Http server running at"
          ,"Root:", root
          ,"Port:", port
        );

        self.httpSvr = httpSvr;
      }

      //Create https server
      if(options.https){
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

    };

    //Public: close http server;
    self.close = function(){
      if(self.httpSvr){
        self.httpSvr.close();
        return true;
      }
      return false;
    };

  };

  return server;

})();