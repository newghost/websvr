
var SessionParser;

//TODO: Need a child process of clear session
(function(){

  var fs = require("fs");

  SessionParser = (function(req, res, callback){

    var sessionDir = Settings.sessionDir;

    var self = {
      //session id
      sid : null,
      //session stored object
      obj : {}
    };

    //TODO
    self.set = function(key, val, callback){

      var sessionfile = sessionDir  + self.sid;

      key && (self.obj[key] = val);

      fs.writeFile( sessionfile, JSON.stringify(self.obj), function(err){
        if(err){
          console.log(err);
          return;
        }

        callback && callback(self);
      });
    };

    //TO DO
    self.get = function(key){
      return self.obj[key];
    };

    self.init = function(){
      var sidKey = "_wsid",
          sidVal,
          cookie = req.headers.cookie || "";

      //Get or Create sid
      var idx = cookie.indexOf(sidKey + "=");

      //sid exist in the cookie, read it
      (idx >= 0) && (sidVal = cookie.substring(idx + 6, idx + 38));

      //sid doesn't exist, create it;
      if(idx < 0 || sidVal.length != 32){
        sidVal = Math.uuid(32);
        res.setHeader("Set-Cookie", " _wsid=" + sidVal + "; path=/");
      };
      self.sid = sidVal;

      //We only receive the cookie from Http headers
      var sessionfile = sessionDir + self.sid;

      //here will be cause a bit of delay
      fs.exists(sessionfile, function (exists) {
        if(exists){
          fs.readFile( sessionfile, function (err, data) {
            if (err) {
              console.log(err);
              return;
            };
            data = data || "{}";
            self.obj = JSON.parse(data);

            callback(self);
          });
        }else{
          //session not exist create one
          self.obj = {};
          self.set(null , null , callback);
        }
      });

    };

    self.init();

    return self;

  });

}());