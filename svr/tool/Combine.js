/*
* Description: Combine the files into one, support directory and config files.
* Author: Kris Zhang
* Blog: http://c52u.com
*/

//Combine namespace
var Combine;

(function() {

  var fs = require("fs"),
      path = require("path"),
      timerID = null;

  var combine = Combine = module.exports = {
    sourceFile: "",
    targetFile: "",
    files: [],          //combine list
    list: [],           //watch list
    watch: false,       //listen on the changes?

    //Interface
    init: function(sourceFile, targetFile, watch) {
      //Combine type, it's a directory or cfg file
      fs.stat(sourceFile, function(err, stat) {
        if (err) {
          console.log(err);
          return;
        }

        combine.sourceFile = sourceFile;
        combine.targetFile = targetFile;
        combine.watch = watch;

        //It's a configuration files or dictionary
        if (stat.isFile()) {
          combine.setCfg(sourceFile);
        } else {
          combine.setDir(sourceFile);
        }
      });
    },

    //get output stream
    getStream: function() {
      var stream;
      try {
        stream = fs.createWriteStream(combine.targetFile);
      } catch (err) {
        console.log("Can't create output stream: ", err);
      }
      return stream;
    },

    //get files from cfgFile, return absolute file path
    getFiles: function(cfgPath) {
      var contents = fs.readFileSync(cfgPath, 'utf-8'),
          files = [],
          lastIdx = cfgPath.lastIndexOf('\\'),
          dir = cfgPath.substring(0, lastIdx > -1 ? lastIdx : cfgPath.lastIndexOf('/') );

      //read a file line-by-line
      contents.match(/[^\r\n]+/g).forEach(function(line) {
        //ignore comments that begin with '#'
        if (line[0] != '#') {
          files.push(path.join(dir, line));
        }
      });

      combine.watch && files.forEach(function(file) {
        if (combine.list.indexOf(file) < 0) {
          combine.watchFile(file);
          combine.list.push(file);
        };
      });

      combine.files = files;

      return files;
    },

    //Watch changes on source folder
    setDir: function(directory) {
      //Combine at the first running, then watching the changes.
      if (combine.combineDir(directory)) {
        combine.watch && fs.watch(directory, function() {
          combine.combineDir(directory);
        });
      }
    },

    //Watch chagnes on configuration fiel
    setCfg: function(configuration) {
      var combineCfg = function() {
        //get file list from the configuration files.
        combine.getFiles(configuration);
        combine.combine();
      };

      //Listen on the change on the configuration file
      combine.watch && fs.watch(configuration, combineCfg);

      //combine at the first running
      combineCfg();
    },

    //Watch changes on a file
    watchFile: function(file) {
      try {
        fs.watch(file, function() {
          combine.combine();
        });
      } catch (err) {
        console.log(file, err);
      }
    },

    //Combine directory
    combineDir: function(directory) {
      try {
        var allFiles = fs.readdirSync(directory),
            //File name must be consist of numbers characters or "-" "_", "."
            fileReg = /^[a-zA-Z0-9-_\.]+$/,
            files = [];

        allFiles.forEach(function(file) {
          if (fileReg.test(file)) {
            files.push(path.join(directory, file));
          } else {
            console.log("Skip file:" + file);
          }
        });

        combine.files = files;

        return combine.combine();
      } catch (err) {
        console.log(err);
        return false;
      }
    },

    //Combine set of files into one
    combine: function() {

      //Prevent other request within 1 seconds;
      if (timerID) return;

      timerID = setTimeout(function() {
        timerID = null;
      }, 1000);

      var oStream = combine.getStream(), r = true;
      if (!oStream) {
        return false;
      }

      var files = combine.files;

      try {
        files.forEach(function(file) {
          var stat = fs.statSync(file);

          if (!stat.isFile()) {
            console.log("Skip folder:" + file);
          } else {
            var data = fs.readFileSync(file);
            oStream.write("/*" + file + "*/\r\n");
            oStream.write(data);
            oStream.write("\r\n");

            console.log("Adding file:" + file);
          }
        });
        oStream.end();
        
        var endTime = new Date();
        console.log("count:",
          files.length,
          ", date:", new Date().toTimeString(),
          "\r\n\r\n"
        );
      } catch (err) {
        console.log(err);
        r = false;
      }

      return r;
    }
  };

})();


/*
* call it from command lines
* -i filepath: input directory or cfg file
* -o filepath: output files
* -w: keep watch the changes?
*/
(function() {

  /*
   * parsing parameters from command line
   * etc, node combine.js -i configfile.path -o outputfile.path
   * the parameter will be: '-' + one character, like: parsing('-o');
   */
  var parsing = function(args, key) {
    if (!key || key.length != 2 || key[0] != '-') return;

    var reg = new RegExp(" " + key + "((?! -\\w).)*", "g"),
        param = args.match(reg);

    if (param && param[0]) {
      return param[0].substr(4, 500);
    }
  };

  var args = process.argv.join(' '),
      input = parsing(args, '-i'),
      output = parsing(args, '-o');

  Combine.init(input, output, args.indexOf(' -w') > 0);

})();
