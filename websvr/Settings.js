/*
Configurations
*/
var Settings = {
  //root folder of web
  root: "../",

  //list files in directory
  listDir: false,

  //http
  http: true,
  //default port of http
  port: 8054,

  //enable client-side cache(304)?
  cache: true,
  //enable debug information output
  debug: false,
  //receive buffer,  default size 32k, i.e.: receive post data from ajax request
  bufferSize: 32768,

  //https
  https: false,
  //default port of https
  httpsPort: 8443,
  httpsOpts: { key:"", cert:"" },

  //logger file path
  logger:     "./tmp/log.txt",

  //session file stored here
  sessionDir: "./tmp/session",
  /*
  Session timeout, in milliseconds.
  When session is expired, session file will not deleted.
  */
  sessionTimeout: 1440000,
  /*
  Session garbage collection time, in milliseconds.
  When session expired time is more than (sessionAge + sessionGCT),
  then session file will be deleted.
  */
  sessionGarbage: 3460000,

  //tempary upload file stored here
  uploadDir:  "./tmp/upload"
};