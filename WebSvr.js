/*
* Description: Create a static file server (http based).
*              This will list all the files and directories via Node.Js.
*              The behavior will be like directory browsing enabled in IIS,
* Author: Kris Zhang
* Blog: http://c52u.com
* Required: Node.js: http://www.nodejs.org,
*           mime.js: https://github.com/bentomas/node-mime
* Date: 2012-3 Draft
*       2012-4 Update: Using async and mime.js
*       2012-7 Update: Rename and reformat files
*/
/*
* WebSvr Namespace
*/
var WebSvr = (function(){

  var server = function(strDir, strPort){
    /*
    Library
    */
    var fs = require("fs"),
      path = require("path"),
      mime = require("./lib/mime");

    /*
    Parameters
    */
    var self = this,
      //Root path
      dir = "C:\\Program Files",
      //Listening port
      port = 8021,
      //How many files?
      count = 0;

    /*
    Modules
    */
    var urlMapper = new UrlMapper(self);



    var urlFormat = function(url){
      url = url.replace(/\\/g,'/');
      url = url.replace(/ /g,'%20');
      return url;
    };

    //align to right
    var date = function(date){
      var d = date.getFullYear() 
        + '-' + (date.getMonth() + 1)
        + '-' + (date.getDay() + 1)
        + " " + date.toLocaleTimeString();
      return "                ".substring(0, 20 - d.length) + d;
    };

    //align to left
    var size = function(num){
      return num + "                ".substring(0, 12 - String(num).length);
    };

    var anchor = function(txt, url){
      url = url ? url : "/";
      return '<a href="' + url + '">' + txt + "</a>";
    };

    var requestHandler = function(request, response){
      //If request matched, send the request;
      if(urlMapper.match(request, response)){
        return;
      }

      count = 0;

      var url = request.url,
          hasQuery = url.indexOf("?");

      //bug: path.join can't recognize the querystring;
      url = hasQuery > 0 ? url.substring(0, hasQuery) : url;

      var fullPath = path.join(dir, url),
          stat;

      try{
        stat = fs.statSync(fullPath)
      }catch(err){
        response.writeHead(404, {"Content-Type": "text/html"});
        response.end("File not found!");
        return;
      }
      
      //List all the files in a directory.
      var listFiles = function(callback){

        fs.readdir(fullPath, function(err, files){
          if(err){
            console.log(err);
            return;
          }

          for(var idx = 0, len = files.length; idx < len; idx++){
            //persistent the idx before make the sync process
            (function(idx){
              var filePath = path.join(fullPath, files[idx]),
                  fileUrl = urlFormat(path.join(url, files[idx]));

              fs.stat(filePath, function(err, stat){
                count++;

                if(err){
                  console.log(err);
                }else{
                  response.write(
                    date(stat.mtime)
                    + "\t" + size(stat.size)
                    + anchor(files[idx], fileUrl)
                    + "\r\n"
                  );
                }

                count == len && callback();
              });
            })(idx);
          }
        });
      };

      //Is file? Open this file and send to client.
      if(stat.isFile()){
        self.writeFile(response, fullPath);
      }
      //Is Directory? List all the files and folders.
      else if(stat.isDirectory()){
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write("<h2>http://localhost:" + port + url + "</h2><hr/>");
        response.write("<pre>");
        response.write(anchor("[To Parent Directory]", url.substr(0, url.lastIndexOf('/'))) + "\r\n\r\n");
        listFiles(function(){
          response.write("</pre><hr/>");
          response.end("<h5>Count: " + count + "</h5>");
        });
      }
    };

    /* Expose the urlMapper handle method*/
    self.url = urlMapper.url;
    self.post = urlMapper.post;

    self.writeFile = function(response, fullPath){
      fs.readFile(fullPath, function(err, data){
        if(err){
          console.log(err);
          return;
        }
        response.writeHead(200, { "Content-Type": mime.lookup(fullPath) });
        response.end(data, "binary");
      });
    };

    /*
    try write file, we don't know the path is relative or absolute.
    */
    self.tryWriteFile = function(response, filePath){
      var stat;
      try{
        stat = fs.statSync(filePath)
      }
      catch(err){
        try{
          filePath = path.join(dir, filePath);
          stat = fs.statSync(filePath);
        }
        catch(e){
          response.writeHead(404, {"Content-Type": "text/html"});
          response.end("File not found!");
        }
      }

      self.writeFile(response, filePath);
    };

    /*
    public: start http server
    */
    self.start = function(){
      // Entry Point
      (function(args){
        dir = args[2] || strDir || dir;
        port = Number(args[3]) || Number(strPort) || port;

        try{
          //Create http server
          var httpSvr = require("http").createServer(requestHandler);
          httpSvr.listen(port);

          console.log("Running at localhost"
            ,"dir:", dir
            ,"Port:", port
          );

          self.httpSvr = httpSvr;

          return true;
        }
        catch(err){
          console.log("Can't setup server at port", port, err);
        }
        return false;
      })(process.argv);

    };

    /*
    public: close http server;
    */
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