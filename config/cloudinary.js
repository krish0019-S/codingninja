var path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config();


var cloudinary = require("cloudinary").v2;

var clean = function (value) {
    return String(value || "").trim().replace(/^["']|["']$/g, "");
};

var first = function (list) {
    for (var i = 0; i < list.length; i += 1) {
        var value = clean(list[i]);
        if (value) return value;
    }
    return "";
};

var cloudName = first([process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_CLOUD, process.env.CLOUD_NAME]);
var apiKey = first([process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_KEY, process.env.API_KEY]);
var apiSecret = first([process.env.CLOUDINARY_API_SECRET, process.env.CLOUDINARY_SECRET, process.env.API_SECRET]);

var isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });
    console.log("[Cloudinary] Configured successfully for cloud:", cloudName);
} else {
    var missing = [];
    if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!apiKey) missing.push("CLOUDINARY_API_KEY");
    if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
    
    console.warn(
        "Cloudinary Configuration Missing: " + missing.join(", ") + ". Check your .env file."
    );
}

module.exports = {
    cloudinary: cloudinary,
    isCloudinaryConfigured: isCloudinaryConfigured,
};
