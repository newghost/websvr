/*
* Description: Create a static file server (http based).
*              This will list all the files and directories via Node.Js.
*              The behavior will be like directory browsing enabled in IIS,
* Author: Kris Zhang
* Blog: http://c52u.com
* Required: Node.js:    http://www.nodejs.org.
* Date: 2012-3 Draft
*/

//FileServer Namespace
var FileServer;

(function(){
	var fs = require("fs"),
		path = require("path");

	var server = FileServer = {
		//Root path
		dir: "C:\\Program Files",
		//Listening port
		port: 8021,
		//How many files?
		count: 0,
		//Request object
		request: null,
		//Response object
		response: null,
		//List all the sub folders?
		listSubFolder: true,

		//Initialize
		init: function(dir, port, listSubFolder){
			server.dir = dir || server.dir;
			server.port = Number(port) || server.port;
			server.listSubFolder = listSubFolder == "true" && server.listSubFolder;

			var http = require("http");
			http.createServer(function(req, res){
				server.count = 0;
				server.request = req;
				server.response = res;
				server.handle(req.url);
				res.end();
			}).listen(server.port);

			console.log("Running at localhost", '\r'
				, "dir:", server.dir, '\r'
				, "Port:", server.port, '\r'
				, "List Sub Folders:", server.listSubFolder, '\r'
			);
		},

		//Split the request, list folders or download file?
		handle: function(url){
			var fullPath = path.join(server.dir, url);
			try{
				stat = fs.statSync(fullPath)
			}catch(err){
				server.response.writeHead(404, {"Content-Type": "text/html"});
				server.write("File not found!", err);
				return;
			}

			//Is file? Open this file and send to client.
			if(stat.isFile()){
				var file = fs.readFileSync(fullPath);
				server.response.writeHead(200, {"Content-Type": "application/octet-stream" });
				server.response.write(file, "binary");
			}

			//Is Directory? List all the files and folders.
			else if(stat.isDirectory()){
				var fullUrl = "http://" + server.request.headers.host + url;

				server.response.writeHead(200, {"Content-Type": "text/html"});
				server.write("<h2>" + fullUrl + "</h2> <hr/>");
				server.write("<pre>");
				server.write(server.anchor("[To Parent Directory]", fullUrl.substr(0, fullUrl.lastIndexOf('/')), true) + "<br/><br/>");
				server.listFiles(fullPath, "");
				server.write("</pre> <hr/>");
				server.write("<h5> Totoal files and directories: " + server.count + "</h5>");
			}
		},

		//List all the files in a directory including the all the sub/child folders.
		listFiles: function(dir, tab){
			var files = fs.readdirSync(dir);

			for(var idx in files){
				server.count++;
				try{
					var	filePath = path.join(dir, files[idx]),
						stat = fs.statSync(filePath);

					server.write(tab
						+ server.anchor(files[idx], path.relative(server.dir, filePath))
						+ "\r\n"
					);

					if(stat.isDirectory() && server.listSubFolder){
						server.listFiles(filePath, tab + "\t");	
					}
				}
				catch(err){
					//TO DO: etc. permission not allowed
				}
			}
		},

		//Write contents to HttpResponse or Console
		write: function(){
			if(server.response){
				for(var i in arguments){
					server.response.write(String(arguments[i]));
				}
			}else{
				console.log(arguments);
			}
		},

		//Create an anchor
		anchor: function(text, url, notFormat){
			if(!notFormat){
				url = '/' + url.replace('\\',  '/');
			}

			return '<a href="' + url + '">' 
				+ text
				+ "</a>";
		},
	};
})();

var fileServer = Object.create(FileServer);
fileServer.init(process.argv[2], process.argv[3], process.argv[4]);
