require("dotenv").config();
var http = require("http");
var jwt = require("jsonwebtoken");
var fs = require("fs");

async function testHttp() {
    var boundary = "--------------------------123456789012345678901234";
    var payload = 
"--" + boundary + "\r\n" +
"Content-Disposition: form-data; name=\"file\"; filename=\"test.png\"\r\n" +
"Content-Type: image/png\r\n\r\n" +
"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==\r\n" +
"--" + boundary + "\r\n" +
"Content-Disposition: form-data; name=\"folder\"\r\n\r\n" +
"test_folder_http\r\n" +
"--" + boundary + "--\r\n";

    var token = jwt.sign({ email: "admin@example.com" }, process.env.JWT_SECRET || "change_this_secret");

    var req = http.request({
        host: "localhost",
        port: 1502,
        path: "/admin/cloudinary-upload",
        method: "POST",
        headers: {
            "Content-Type": "multipart/form-data; boundary=" + boundary,
            "Content-Length": Buffer.byteLength(payload),
            "Authorization": "Bearer " + token
        },
    }, function (res) {
        var body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
            console.log("Status Code:", res.statusCode);
            console.log("Response:", body);
        });
    });

    req.on("error", function (e) {
        console.error("HTTP error:", e);
    });

    req.write(payload);
    req.end();
}

testHttp();
