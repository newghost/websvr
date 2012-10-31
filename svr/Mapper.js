/*
Mapper: Used for Filter & Handler,
expression: required parameter
handler: required parameter
options: other optional parameters
*/

var Mapper = function(expression, handler, options){
  var self = this;

  self.expression = expression;
  self.handler = handler;

  //Has other parameters?
  self.extend(options);
};

Mapper.prototype = {
  /*
  Does this mapper matched this request?
  */
  match: function(req){
    var self = this,
        expression = self.expression;

    switch(expression.constructor){
      case String: return req.url.indexOf(expression) > -1;
      case RegExp: return expression.test(req.url);
    }

    return false;
  },

  /*
  Add optional parameters on current mapper
  i.e:
  session:  boolean
  file:     boolean
  parse:    boolean
  */ 
  extend: function(options){
    for(key in options){
      this[key] = options[key]
    }
  }
};