/* UrlMap.js
Url mapper
*/
var UrlMapper = function(){
  var self = this,
      maps = [];

  /*
  Add a maching rule
  */
  self.add = function(regExp, handler){
    maps.push({regExp: regExp, handler: handler});
  };

  self.parse = function(regExp, handler){
    maps.push({regExp: regExp, handler: handler, parse: true});
  };

  /*
  Mapping the url
  */
  self.match = function(req, res){
    for(var i = 0, len = maps.length; i < len ; i++){

      var mapper = maps[i];
      if(mapper.regExp && mapper.regExp.test(req.url)){

        try{
          var handler = mapper.handler;

          switch(typeof handler){
            //function: treated it as custom function handler
            case "function":
              //need to parse the request?
              if(mapper.parse){
                RequestParser(req, res, handler);
              }else{
                handler(req, res);  
              }
              return true;

            //string: treated it as content
            case "string":
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(handler);
              return true;

            //array: array is an object, treated it as file.
            case "object":
              webSvr.tryWriteFile(res, handler[0]);
              return true;
          }
          console.log(typeof handler, handler);
        }
        catch(err){ console.log(err) }
      }
    }
    return false;
  };

  return self;

};