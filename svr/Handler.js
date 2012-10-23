/*
Http Handler: Execute and returned when when first matched;
At the same time only one Handler will be called;
*/
var Handler;

(function(){

  /*
  Private: web server instance
  */
  var webSvr;

  /*
  Private: handler list
  */
  var handlers = [];

  /*
  Static Handler instance
  */
  Handler = {

    url : function(regExp, handler, options){
      var params = {regExp: regExp, handler: handler};
      handlers.push(Object.extend(params, options));
    },

    //Post: Parse the post data by default;
    post : function(regExp, handler, options){
      var params = { parse: true };
      this.url(regExp, handler, Object.extend(params, options));
    },

    //Session: Parse the session and post by default;
    session : function(regExp, handler){
      this.url(regExp, handler, { parse:true, session: true });
    },

    handle : function(req, res){
      //flag: is matched?
      for(var i = 0, len = handlers.length; i < len ; i++){

        var mapper = handlers[i];
        if(mapper.regExp && mapper.regExp.test(req.url)){

          console.log("handler matched", i, mapper.regExp, req.url);

          try{
            var handler = mapper.handler,
                type = handler.constructor.name;

            switch(type){
              //function: treated it as custom function handler
              case "Function":
                Parser(req, res, mapper);
                break;

              //string: treated it as content
              case "String":
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(handler);
                break;

              //array: treated it as a file.
              case "Array":
                res.writeFile(handler[0]);
                break;
            }
          }
          catch(err){ 
            console.log(err)
          }

          return true;
        }
      }
      return false;
    }   //end of handler

  };

}());



