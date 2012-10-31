/*
Http Filter: Execute all the rules that matched,
Filters will be always called before a handler. 
*/
var Filter = {
  //filter list
  filters : [],
  
  /*
  add a new filter
  */
  add : function(expression, handler, options){
    var mapper = new Mapper(expression, handler, options);
    Filter.filters.push(mapper);
  },

  /*
  file receiver: it's a specfic filter,
  this filter should be always at the top of the filter list
  */
  file: function(expression, handler, options){
    var mapper = new Mapper(expression, handler, {file: true}); 
    //insert as the first elements
    Filter.filters.splice(0, 0, mapper);
  }
};

/*
Filter Chain
*/
var FilterChain = function(cb){
  var self = this;
  self.idx = 0;
  self.cb = cb;
};

FilterChain.prototype = {
  next : function(req, res){
    var self = this;

    var mapper = Filter.filters[self.idx++];

    //filter is complete, execute callback;
    if(!mapper) return self.cb && self.cb();

    /*
    If not Matched go to next filter
    If matched need to execute the req.next() in callback handler,
    e.g:
    webSvr.filter(/expression/, function(req, res){
      //filter actions
      req.next(req, res);
    }, options);
    */
    if(mapper.match(req)){

      console.log("filter matched", self.idx, mapper.expression, req.url);

      Parser(req, res, mapper);
    }else{
      self.next(req, res);
    }
  }
};