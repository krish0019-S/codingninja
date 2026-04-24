var mongoose = require("mongoose");

var portfolioItemSchema = new mongoose.Schema(
    {
        category: { type: String, required: true, trim: true },
        folder: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        path: { type: String, required: true, trim: true },
        public_id: { type: String, required: true, trim: true },
        size: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

module.exports = mongoose.models.PortfolioItem || mongoose.model("PortfolioItem", portfolioItemSchema);
