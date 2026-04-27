var multer = require("multer");

var MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

var imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: function (req, file, cb) {
        var mimeType = String(file && file.mimetype || "").toLowerCase();
        if (mimeType.startsWith("image/")) {
            return cb(null, true);
        }
        return cb(new Error("Only image files are allowed."));
    },
});

var handleSingleImageUpload = function (fieldName) {
    return function (req, res, next) {
        imageUpload.single(fieldName)(req, res, function (error) {
            if (!error) {
                return next();
            }

            if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "Image size should be 5MB or less.",
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || "Invalid upload request.",
            });
        });
    };
};

module.exports = {
    MAX_IMAGE_SIZE_BYTES: MAX_IMAGE_SIZE_BYTES,
    handleSingleImageUpload: handleSingleImageUpload,
};

