var mongoose = require("mongoose");

var newsItemSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true, trim: true },
        contentLink: { type: String, default: "", trim: true },
        imageUrl: { type: String, default: "", trim: true },
        sequence: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    }
);

module.exports = mongoose.models.NewsItem || mongoose.model("NewsItem", newsItemSchema);
