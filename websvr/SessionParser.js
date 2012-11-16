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
    (idx >= 0) && (sidVal = cookie.substring(idx + 6, idx + 38));

    //Sid doesn't exist, create it
    if (idx < 0 || sidVal.length != 32) {
      sidVal = Math.uuid(32);
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
          console.log(err);
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