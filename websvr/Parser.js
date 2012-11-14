/*
Parser: Functions that Filter and Handler will be called 
*/
var Parser = function(req, res, mapper) {

  var handler = mapper.handler;

  //add sesion support
  var parseSession = function() {
    //add sesion support
    if (mapper.session && typeof req.session == "undefined") {
      req.session = new SessionParser(req, res);
    }
    handler(req, res);
  };

  /*
  parse data in request, this should be done before parse session,
  because session stored in file
  */
  var parseBody = function() {
    //need to parse the request?
    if (mapper.parse && typeof req.body == "undefined") {
      //Must parser the request first, or the post data will lost;
      BodyParser(req, res, function(data) {
        req.body = data;
        parseSession();
      });
    }else{
      parseSession();
    }
  };

  /*
  parse file in request, this should be at the top of the list
  */
  var parseFile = function() {
    //Need to parse the file in request?
    if (mapper.file && typeof req.body == "undefined") {
      //Must parser the request first, or the post data maybe lost;
      var formidable = require('./lib/incoming_form'),
          form = new formidable.IncomingForm();

      form.uploadDir = Settings.uploadDir;

      form.parse(req, function(err, fields, files) {
        if (err) {
          console.log(err);
          return;
        };

        //attach the parameters and files
        req.body  = fields;
        req.files = files;

        //in fact request will not be parsed again, because body is not undefined
        parseBody();
      });
    }else{
      parseBody();
    };
  };

  parseFile();

};
