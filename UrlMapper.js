/*
UrlMapper : mapping url;
*/

var UrlMapper = function(){
  var self = this,
      maps = [];

  self.add = function(regExp, handler){
    maps.push({regExp: regExp, handler: handler});
  };

  /*
  Map the url
  */
  self.match = function(req, res){
    for(var i = 0, len = maps.length; i < len ; i++){
      var mapper = maps[i];
      if(mapper.regExp && mapper.regExp.test(req.url)){
        try{
          mapper.handler && mapper.handler(req, res);
          return true;
        }
        catch(err){ console.log(err) }
      }
    }
    return false;
  };

};