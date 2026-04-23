require("dotenv").config();
var { cloudinary, isCloudinaryConfigured } = require("./config/cloudinary");
var { connectMongo } = require("./config/mongo");
var MediaItem = require("./models/MediaItem");

async function test() {
    await connectMongo();
    console.log("Cloudinary Configured:", isCloudinaryConfigured);
    
    var buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    
    var uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "test_folder" },
        async function (error, result) {
            if (error) {
                console.error("Cloudinary error:", error);
                process.exit(1);
            }
            console.log("Cloudinary success:", result.secure_url);
            
            try {
                var item = await MediaItem.create({
                    url: result.secure_url,
                    folder: "test_folder",
                    folderUrl: "test_folder",
                    type: "image",
                    publicId: result.public_id,
                    resourceType: result.resource_type,
                });
                console.log("DB success:", item);
                process.exit(0);
            } catch (dbError) {
                console.error("DB error:", dbError);
                process.exit(1);
            }
        }
    );
    
    uploadStream.end(buffer);
}

test();
