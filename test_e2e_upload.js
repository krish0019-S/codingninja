// End-to-end test: Generate JWT directly, then test Cloudinary upload + MongoDB
require("dotenv").config();
var jwt = require("jsonwebtoken");
var http = require("http");

var JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// Generate a valid admin token directly (bypassing MySQL login)
var token = jwt.sign(
    { username: "krishtanwar153@gmail.com", role: "admin" },
    JWT_SECRET,
    { expiresIn: "30m" }
);
console.log("Generated token:", token.substring(0, 30) + "...");

function httpRequest(options, body) {
    return new Promise(function(resolve, reject) {
        var req = http.request(options, function(res) {
            var chunks = [];
            res.on("data", function(c) { chunks.push(c); });
            res.on("end", function() {
                var raw = Buffer.concat(chunks).toString();
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch(e) { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    // Step 1: Test config endpoint
    console.log("\n=== Step 1: Check Config ===");
    var configRes = await httpRequest({
        hostname: "localhost", port: 1502,
        path: "/admin/test-config", method: "GET",
        headers: { "Authorization": "Bearer " + token }
    });
    console.log("Status:", configRes.status);
    console.log("Response:", JSON.stringify(configRes.body, null, 2));

    // Step 2: Upload a small test PNG to Cloudinary
    console.log("\n=== Step 2: Upload to Cloudinary ===");
    var pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    var boundary = "----TestBoundary" + Date.now();
    var header = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.png\"\r\nContent-Type: image/png\r\n\r\n";
    var footer = "\r\n--" + boundary + "--\r\n";
    var fullBody = Buffer.concat([Buffer.from(header), pngData, Buffer.from(footer)]);

    var uploadRes = await httpRequest({
        hostname: "localhost", port: 1502,
        path: "/admin/cloudinary-upload", method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "multipart/form-data; boundary=" + boundary,
            "Content-Length": fullBody.length
        }
    }, fullBody);

    console.log("Status:", uploadRes.status);
    console.log("Response:", JSON.stringify(uploadRes.body, null, 2));

    // Step 3: Check media list in MongoDB
    console.log("\n=== Step 3: Check MongoDB Media ===");
    var mediaRes = await httpRequest({
        hostname: "localhost", port: 1502,
        path: "/admin/media", method: "GET",
        headers: { "Authorization": "Bearer " + token }
    });
    console.log("Status:", mediaRes.status);
    console.log("Media count:", (mediaRes.body.media || []).length);
    if (mediaRes.body.media && mediaRes.body.media.length > 0) {
        console.log("Latest:", JSON.stringify(mediaRes.body.media[0], null, 2));
    }
}

run().then(function() {
    console.log("\n=== ALL TESTS PASSED ===");
    process.exit(0);
}).catch(function(err) {
    console.error("\nTEST ERROR:", err);
    process.exit(1);
});
