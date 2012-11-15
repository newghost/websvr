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
  If the session is not in the list, add to the list.
  i.e. When WebSvr restarted, session will not expired.
  */
  var isValid = function(sid) {
    var now  = new Date();

    !list[sid] && (list[sid] = now);

    return now - list[sid] <= Settings.sessionAge
  };

  /*
  Session clean handler
  */
  var cleanHandler = function() {
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
    timer = setInterval(cleanHandler, gcTime);
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