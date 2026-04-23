var mongoose = require("mongoose");

var mediaItemSchema = new mongoose.Schema(
    {
        url: { type: String, required: true, trim: true },
        folder: { type: String, default: "rudraksh_media", trim: true },
        folderUrl: { type: String, default: "", trim: true },
        type: { type: String, enum: ["image", "video"], default: "image" },
        publicId: { type: String, default: "", trim: true },
        resourceType: { type: String, enum: ["image", "video", "raw", "auto"], default: "auto" },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

module.exports = mongoose.models.MediaItem || mongoose.model("MediaItem", mediaItemSchema);
