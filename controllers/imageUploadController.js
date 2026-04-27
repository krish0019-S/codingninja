var stream = require("stream");
var { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
var { connectMongoWithRetry } = require("../config/mongo");
var MediaItem = require("../models/MediaItem");

var normalizeCloudinaryFolder = function (value) {
    var text = String(value || "").trim();
    if (!text) {
        return "rudraksh_media";
    }

    var cleaned = text
        .replace(/\\/g, "/")
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\/{2,}/g, "/");

    if (!/^[a-zA-Z0-9/_-]{1,120}$/.test(cleaned)) {
        return "rudraksh_media";
    }

    return cleaned;
};

var uploadImageBufferToCloudinary = function (buffer, options) {
    return new Promise(function (resolve, reject) {
        var uploadStream = cloudinary.uploader.upload_stream(options, function (error, result) {
            if (error) {
                return reject(error);
            }
            return resolve(result);
        });

        stream.Readable.from(buffer).pipe(uploadStream);
    });
};

var uploadImageDirectToCloudinary = async function (req, res) {
    if (!isCloudinaryConfigured) {
        return res.status(500).json({
            success: false,
            message: "Cloudinary is not configured on server.",
        });
    }

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({
            success: false,
            message: "No image uploaded.",
        });
    }

    try {
        var folder = normalizeCloudinaryFolder(req.body && req.body.folder);
        var result = await uploadImageBufferToCloudinary(req.file.buffer, {
            folder: folder,
            resource_type: "image",
        });

        var secureUrl = String(result && result.secure_url || "").trim();
        await connectMongoWithRetry();
        await MediaItem.create({ url: secureUrl });

        return res.json({
            success: true,
            imageUrl: secureUrl,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error && error.message ? error.message : "Unable to upload image.",
        });
    }
};

module.exports = {
    uploadImageDirectToCloudinary: uploadImageDirectToCloudinary,
};

