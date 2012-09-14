/*
Url mapper
*/
var UrlMapper = function(webSvr){
  var self = this,
      maps = [];

  /*
  Handle matched rule;
  */
  self.url = function(regExp, handler, parse){
    maps.push({regExp: regExp, handler: handler, parse: parse});
  };

  /*
  Parse the post request data
  */
  self.post = function(regExp, handler){
    self.url(regExp, handler, true);
  };

  /*
  Mapping the url
  */
  self.match = function(req, res){
    for(var i = 0, len = maps.length; i < len ; i++){

      var mapper = maps[i];
      if(mapper.regExp && mapper.regExp.test(req.url)){

        try{
          var handler = mapper.handler,
              type = handler.constructor.name;

          switch(type){
            //function: treated it as custom function handler
            case "Function":
              //need to parse the request?
              if(mapper.parse){
                RequestParser(req, res, handler);
              }else{
                handler(req, res);  
              }
              return true;

            //string: treated it as content
            case "String":
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(handler);
              return true;

            //array: treated it as a file.
            case "Array":
              webSvr.tryWriteFile(res, handler[0]);
              return true;
          }
        }
        catch(err){ console.log(err) }
      }
    }
    return false;
  };

  return self;

};