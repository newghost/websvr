/*
* Description: Combine the files into one, support directory and config files.
* Author: Kris Zhang
* Blog: http://c52u.com
*/

(function(){

  var fs = require("fs"),
      path = require("path");

  var combine = module.exports = {
    //Combined to which file?
    targetFile: "",

    //Interface
    init: function(sourceFile, targetFile, watch){
      //Combine type, it's a directory or cfg file
      fs.stat(sourceFile, function(err, stat){
        if(err) {
          console.log(err);
          return;
        }

        combine.targetFile = targetFile;

        if(stat.isFile()){
          //get file list from the configuration files.
          var files = combine.getFiles(sourceFile);

          if(combine.combine(files)){
            watch && combine.watchFiles(files);
          }
        }else{
          //Combine at the first running, then watching the changes.
          if(combine.combineDir(sourceFile)){
            watch && combine.watchDir(sourceFile);
          }
        }
      });
    },

    //get output stream
    getStream: function(){
      var stream;
      try{
        stream = fs.createWriteStream(combine.targetFile);
      }
      catch(err){
        console.log("Can't create output stream: ", err);
      }
      return stream;
    },

    //get files from cfgFile, return absolute file path
    getFiles: function(cfgPath){
      var contents = fs.readFileSync(cfgPath, 'utf-8'),
          files = [],
          lastIdx = cfgPath.lastIndexOf('\\'),
          dir = cfgPath.substring(0, lastIdx > -1 ? lastIdx : cfgPath.lastIndexOf('/') );

      //read a file line-by-line
      contents.match(/[^\r\n]+/g).forEach(function(line){
        //ignore comments that begin with '#'
        if(line[0] != '#'){
          files.push(path.join(dir, line));
        }
      });

      return files;
    },

    //Watch changes on list of files
    watchFiles: function(files){
      files.forEach(function(file){
        fs.watch(file, function(evt, filename){
          combine.combine(files);
        });
      });
    },

    //Watch changes on source folder
    watchDir: function(directory){
      fs.watch(directory, function(evt, filename){
        combine.combineDir(directory);
      });
    },

    //Combine directory
    combineDir: function(directory){
      try{
        var allFiles = fs.readdirSync(directory),
            //File name must be consist of numbers characters or "-" "_", "."
            fileReg = /^[a-zA-Z0-9-_\.]+$/,
            files = [];

        allFiles.forEach(function(file){
          if(fileReg.test(file)){
            files.push(path.join(directory, file));
          }else{
            console.log("Skip file:" + file);
          }
        });

        return combine.combine(files);
      }
      catch(err){
        console.log(err);
        return false;
      }
    },

    //Combine set of files into one
    combine: function(files){
      var oStream = combine.getStream(), r = true;
      if(!oStream){
        return false;
      }

      try{
        files.forEach(function(file){
          var stat = fs.statSync(file);

          if(!stat.isFile()){
            console.log("Skip folder:" + file);
          }else{
            var data = fs.readFileSync(file);
            oStream.write("/*" + file + "*/\r\n");
            oStream.write(data);
            oStream.write("\r\n");

            console.log("Adding file:" + file);
          }
        });
        oStream.end();
        
        var endTime = new Date();
        console.log("count:", files.length,
            ", date:", new Date().toTimeString(),
            "\r\n\r\n"
        );
      }
      catch(err){
        console.log(err);
        r = false;
      }

      return r;
    }
  };

  /*
   * parsing parameters from command line
   * etc, node combine.js -i configfile.path -o outputfile.path
   * the parameter will be: '-' + one character, like: parsing('-o');
   */
  var parsing = function(args, key){
    if(!key || key.length != 2 || key[0] != '-') return;

    var reg = new RegExp(" " + key + "((?! -\\w).)*", "g"),
        param = args.match(reg);

    if(param && param[0]){
      return param[0].substr(4, 500);
    }
  };

  /*
  * call it
  * -i filepath: input directory or cfg file
  * -o filepath: output files
  * -w: keep watch the changes?
  */
  (function(){
    var args = process.argv.join(' '),
        input = parsing(args, '-i'),
        output = parsing(args, '-o');

    combine.init(input, output, args.indexOf(' -w') > 0);

  })();

})();
