/*
Clear timeout session files
*/
var SessionCleaner = (function() {

  var list = [];

  var add = function() {

  };

  return {
    add: add
  };

})();


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

  //sessoin file path
  self.path = null;

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

    //Update sessionfile path
    self.path = path.join(Settings.sessionDir, self.sid);
  }

  //Clear session file, not stable, will not remove the expired sessoin file here
  /*
  , clear: function(key, cb) {
    //Key is offered, return null of this key, else return empty session object
    var self = this,
        val = key ? null : {};

    fs.unlink(self.path, function (err) {
      if (err) console.log(err);
      //return an empty sesson object
      cb && cb(val);
    });
  }
  */

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

    //update session file accesstime
    var time = new Date();
    fs.utimes(self.path, time, time);

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
      fs.writeFile(self.path, JSON.stringify(self.obj), function(err) {
        if (err) {
          console.log(err);
          return;
        }

        //Update access date time in case of the session file is still existing
        var time = new Date();
        fs.utimes(self.path, time, time, function() {
          cb && cb(self.obj);
        });

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

    //File operates, will cause delay
    fs.stat(self.path, function(err, stats) {
      //err: file doesn't exist
      if (err) {
        return self.newObj(key, cb);

      //session is not timeout
      } else if (new Date() - stats.atime <= Settings.sessionAge) {
        fs.readFile(self.path, function(err, data) {
          if (err) {
            console.log(err);
            return;
          };
          data = data || "{}";
          self.obj = JSON.parse(data);

          return self.getVal(key, cb);
        });

      //session is timeout, treat it as new session
      } else {
        return self.newObj(key, cb);
      }
    });
  }

};