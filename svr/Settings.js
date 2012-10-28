/*
Configurations
*/
var Settings = {
  version: 0.022,

  //root folder of web
  root: "../",

  //http
  http: true,
  //default port of http
  port: 8054,

  //https
  https: false,
  //default port of https
  httpsPort: 8443,
  httpsOpts: {
    key: require("fs").readFileSync("cert/privatekey.pem"),
    cert: require("fs").readFileSync("cert/certificate.pem")
  },

  //session file stored here, must be end with "/"
  sessionDir: "../tmp/session/",
  //tempary upload file stored here, must be end with "/"
  uploadDir:  "../tmp/upload/"
};
