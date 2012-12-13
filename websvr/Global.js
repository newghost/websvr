/*
* Description:  node-websvr
* Author:       Kris Zhang
* Licenses:     MIT, GPL
* Project url:  https://github.com/newghost/node-websvr
*
* Referenced projects:
* Formidable: Support uploading files, integrate
  https://github.com/felixge/node-formidable/
* Underscore: Add underscore a utility-belt library for JavaScript
  https://github.com/documentcloud/underscore
* MIME: content-type in header
  https://github.com/broofa/node-mime
* template: Template Engine
  https://github.com/olado/doT
*/

//Node libraries
var fs      = require("fs");
var path    = require("path");
var qs      = require("querystring");

var http    = require("http");
var https   = require("https");

//Open source libraries
var mime    = require("./lib/mime");