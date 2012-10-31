/*
Http Handler: Execute and returned when when first matched;
At the same time only one Handler will be called;
*/
var Handler;

(function(){

  /*
  Private: handler list
  */
  var handlers = [];

  /*
  Static Handler instance
  */
  Handler = {
    /*
    url: add a new handler
    expression: string/regexp [required]
    handler:    [many types]  [required]
    options:    object        [optional]
    */
    url : function(expression, handler, options){
      var mapper = new Mapper(expression, handler, options);
      handlers.push(mapper);
    },

    //Post: Parse the post data by default;
    post : function(expression, handler, options){
      this.url(expression, handler, _.extend({ parse: true }, options));
    },

    //Session: Parse the session and post by default;
    session : function(expression, handler){
      this.url(expression, handler, { parse: true, session: true });
    },

    handle : function(req, res){
      //flag: is matched?
      for(var i = 0, len = handlers.length; i < len ; i++){

        var mapper = handlers[i];
        if(mapper.match(req)){

          console.log("handler matched", i, mapper.expression, req.url);

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
          return true;
        }
      }

      return false;

    }   //end of handle

  };

}());



