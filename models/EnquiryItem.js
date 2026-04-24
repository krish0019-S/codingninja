var mongoose = require("mongoose");

var enquiryItemSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        source: { type: String, default: "contact", trim: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    }
);

module.exports = mongoose.models.EnquiryItem || mongoose.model("EnquiryItem", enquiryItemSchema);
