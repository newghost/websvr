/*
SessionManager:
- Clear expired session files
- Valid session
*/
var SessionManager = (function() {

  //duration time
  var gcTime = Settings.sessionTimeout + Settings.sessionGarbage;

  //timer
  var timer;

  //session array object, stored with {sid: [update time]};
  var list = {};

  var getPath = function(sid) {
    return path.join(Settings.sessionDir, sid);
  };

  //create a new session id
  var create = function() {
    //Time stamp, change interval is 18.641 hours, higher 6 bits will be kept, this is used for delete the old sessions
    var uuid 
      = ((+new Date()) / 60000 | 0)          //Time stamp, change interval is 1 min, 8 chars
      + '-'
      + ((Math.random() * 0x4000000 | 0))    //Random 1: Used for distinguish the session, max 8 chars
      + ((Math.random() * 0x4000000 | 0));   //Random 2: Used for distinguish the session, max 8 chars

    //fix the length to 25
    uuid += '00000000000000000000'.substr(0, 25 - uuid.length);

    return uuid;
  };

  //force update session in list
  var update = function(sid, datetime) {
    list[sid] = datetime || new Date();
  };

  //remove a sesson from list
  var remove = function(sid) {
    //delete the file
    fs.unlink(getPath(sid));
    //remove from list
    delete list[sid];

    Logger.log("session removed", sid);
  };

  /*
  Does session expired?
  If the session is not in the list, add to the list.
  i.e. When WebSvr restarted, session will not expired.
  */
  var isValid = function(sid) {
    var now  = new Date();

    !list[sid] && (list[sid] = now);

    return now - list[sid] <= Settings.sessionTimeout
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
      if (err) return Logger.log(err);

      //converted to minutes
      var expire = (+new Date() - gcTime) / 60000 | 0;

      files.forEach(function(file) {
        if (file.length == 25) {
          var stamp = parseInt(file.substr(0, file.indexOf('-')));

          if (stamp) {
            //remove the expired session
            stamp < expire
              ? remove(file)
              : Logger.log("session skipped", file);
          } 
        }
      });
    });
  };

  //refresh session in list, valid first, if not expired, update the time
  var refresh = function(sid, datetime) {
    isValid(sid) && update(sid, datetime);
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

  return {
    list:   list,
    create: create,
    update: update,
    remove: remove,
    refresh: refresh,
    isValid: isValid,
    getPath: getPath,
    clean: clean,
    start: start,
    stop:  stop
  }

})();