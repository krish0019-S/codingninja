var EnquiryItem = require("../models/EnquiryItem");
var { connectMongoWithRetry } = require("../config/mongo");

var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_REGEX = /^(?:\+\d{1,3}\s)?\d{10}$/;
var SOURCE_WHITELIST = new Set(["home", "contact"]);
var DEFAULT_LIMIT = 200;
var MAX_LIMIT = 1000;
var MAX_ADDRESS_LENGTH = 150;
var MAX_MESSAGE_LENGTH = 100;

var normalizeText = function (value) {
    return String(value == null ? "" : value).trim();
};

var normalizeSource = function (source) {
    var normalized = normalizeText(source).toLowerCase();
    if (!SOURCE_WHITELIST.has(normalized)) {
        return "contact";
    }
    return normalized;
};

var isExampleEmail = function (email) {
    return /@example\.(com|net|org)$/i.test(normalizeText(email));
};

var buildBadRequestError = function (message) {
    var error = new Error(message);
    error.statusCode = 400;
    return error;
};

var ensureEnquiriesTable = async function () {
    // Kept for compatibility with existing startup flow.
    return true;
};

var validateEnquiryPayload = function (payload) {
    var fullName = normalizeText(payload.fullName);
    var email = normalizeText(payload.email).toLowerCase();
    var phone = normalizeText(payload.phone).replace(/\s+/g, " ");
    var address = normalizeText(payload.address);
    var message = normalizeText(payload.message);
    var source = normalizeSource(payload.source);

    if (fullName.length < 2 || fullName.length > 120) {
        throw buildBadRequestError("Enter a valid full name.");
    }

    if (!EMAIL_REGEX.test(email)) {
        throw buildBadRequestError("Enter a valid email address.");
    }

    if (isExampleEmail(email)) {
        throw buildBadRequestError("Example email is not allowed.");
    }

    if (!PHONE_REGEX.test(phone)) {
        throw buildBadRequestError("Enter a valid 10-digit phone number.");
    }

    if (address.length < 2 || address.length > MAX_ADDRESS_LENGTH) {
        throw buildBadRequestError("Enter a valid address.");
    }

    if (message.length < 3 || message.length > MAX_MESSAGE_LENGTH) {
        throw buildBadRequestError("Enter a valid message.");
    }

    return {
        fullName: fullName,
        email: email,
        phone: phone,
        address: address,
        message: message,
        source: source,
    };
};

var createEnquiry = async function (payload) {
    var cleaned = validateEnquiryPayload(payload || {});
    await connectMongoWithRetry();

    var item = await EnquiryItem.create({
        fullName: cleaned.fullName,
        email: cleaned.email,
        phone: cleaned.phone,
        address: cleaned.address,
        message: cleaned.message,
        source: cleaned.source
    });

    return {
        id: item._id,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        address: item.address,
        message: item.message,
        source: item.source,
    };
};

var listEnquiries = async function (limit) {
    var numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit <= 0) {
        numericLimit = DEFAULT_LIMIT;
    }
    if (numericLimit > MAX_LIMIT) {
        numericLimit = MAX_LIMIT;
    }
    await connectMongoWithRetry();

    var items = await EnquiryItem.find().sort({ createdAt: -1 }).limit(numericLimit).lean();

    return items.map(function (row) {
        return {
            id: row._id,
            fullName: row.fullName,
            email: row.email,
            phone: row.phone,
            address: row.address,
            message: row.message,
            source: row.source,
            createdAt: row.createdAt,
        };
    });
};

var deleteEnquiry = async function (id) {
    await connectMongoWithRetry();
    var result = await EnquiryItem.findByIdAndDelete(id);
    return result != null;
};

var countEnquiries = async function () {
    await connectMongoWithRetry();
    return await EnquiryItem.countDocuments();
};

module.exports = {
    createEnquiry: createEnquiry,
    countEnquiries: countEnquiries,
    deleteEnquiry: deleteEnquiry,
    ensureEnquiriesTable: ensureEnquiriesTable,
    isExampleEmail: isExampleEmail,
    listEnquiries: listEnquiries,
};
