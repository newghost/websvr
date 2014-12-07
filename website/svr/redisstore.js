/*
* Description:  Session stored in redis for websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/websvr-redis
*/

var redis = require('redis');

var RedisStore = module.exports = (function() {

  var client;

  var del = function(sid) {
    client.del(sid);
  };

  var set = function(sid, session) {
    client.set(sid, JSON.stringify(session), function(err) {
      err && console.error(err);
    });
  };

  var get = function(sid, cb) {
    var session = {};

    client.get(sid, function(err, data) {
      if (err) {
        console.error(err);
      } else {
        try {
          session = JSON.parse(data);
        } catch(e) {
          del(sid);
        }
      }

      cb && cb(session);
    });
  };

  /*
  Clear the sessions, you should do it manually somewhere, etc:
  setInterval(websvr.SessionStore.clear, 200 * 60 * 1000)
  */
  var clear = function() {
    client.keys('*', function (err, keys) {
      if (err) return console.log(err);

      //Delete these sessions that created very very long ago
      var expire = +new Date() - Settings.sessionTimeout * 24;

      for (var i = 0; i < keys.length; i++) {
        var key  = keys[i]
          , idx  = key.indexOf('-')
          , flag = true
          ;

        if (key.length == 25 && idx > 0) {
          var stamp = parseInt(key.substr(0, idx), 32);
          //expired?
          stamp && stamp > expire && (flag = false);
        }

        flag && del(key);
      }
    });
  };

  var start = function(options) {
    options = options || {};

    var host = options.host   || '127.0.0.1'
      , port = parseInt(options.host) || 6379
      , opts = options.opts   || {}
      , auth = options.auth
      , idx  = options.select || 0
      ;

    client = redis.createClient(port, host, opts);

    auth && client.auth(auth);

    client.select(idx);

    client.on('error', function (err) {
      console.error('Error ' + err);
    });
  };

  return {
      get   : get
    , set   : set
    , del   : del
    , clear : clear
    , start : start
  }

})();