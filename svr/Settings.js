/*
Configurations
*/
var Settings = {
  version: 0.022,

  //root folder of web
  root: "../",

  //default port of web
  port: 8054,
  //enable https?
  https: {
    enable: false,
    port: 8443,
    options: {
      //pfx: require("fs").readFileSync('server.pfx')
    }
  },

  //session file stored here, must be end with "/"
  sessionDir: "../tmp/session/",
  //tempary upload file stored here, must be end with "/"
  uploadDir:  "../tmp/upload/"
};
