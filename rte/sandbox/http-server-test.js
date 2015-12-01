//
// Copyright (c) 2011 - 2015 ASPECTRON Inc.
// All Rights Reserved.
//
// This file is part of JSX (https://github.com/aspectron/jsx) project.
//
// Distributed under the MIT software license, see the accompanying
// file LICENSE
//
pragma("event-queue");

var http = require("http");
var util = require("util");

console.log("HARMONY v0.1.0 Test Workspace");

var port = 9009;
var http_server = new http.Server(port);

http_server.digest("/root", new http.FilesystemService(rt.local.rtePath + "/sandbox"));

http_server.digest("/", function(request, writer) 
{
    writer.write("<html><head></head><body> Hello Web Browser World! :)<p/>");
    
    var file = rt.local.rootPath + request.resource;

    writer.write("This output is generated by <a href='/root/http-server-test.js'>/root/http-server-test.js</a><p/>")

    writer.write("Request Object:<br/>")
    writer.write("<pre>" + util.inspect(request) + "</pre><p/>");

    writer.write("Current Run-Time Environment Object (rt):<br/>")
    writer.write("<pre>" + util.inspect(rt) + "</pre>");

    writer.write("</body></html>");
    writer.send();

});

http_server.start();
console.log("Please point your browser to: http://localhost:" + port);