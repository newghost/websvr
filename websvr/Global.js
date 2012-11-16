/*
* Description: WebSvr
* Author: Kris Zhang
* Lincense: MIT, GPL
* Included Projects:
- Formidable: Support uploading files, integrate
  https://github.com/felixge/node-formidable/
- Formidable: Support uploading files, integrate
  https://github.com/felixge/node-formidable/
- Underscore: Add underscore a utility-belt library for JavaScript
  https://github.com/documentcloud/underscore
- MIME: content-type in header
  https://github.com/broofa/node-mime
- template: Template Engine
  https://github.com/olado/doT
*/

//Node library
var fs      = require("fs");
var path    = require("path");
var qs      = require("querystring");

var http    = require("http");
var https   = require("https");

//Open source library
var _       = require("./lib/underscore");
var mime    = require("./lib/mime");