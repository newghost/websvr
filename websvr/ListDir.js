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