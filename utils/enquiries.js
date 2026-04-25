var EnquiryItem = require("../models/EnquiryItem");
var db = require("../config/db");

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
    await db.query(
        "CREATE TABLE IF NOT EXISTS enquiries (" +
        "id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "full_name VARCHAR(120) NOT NULL, " +
        "email VARCHAR(190) NOT NULL, " +
        "phone VARCHAR(32) NOT NULL, " +
        "address VARCHAR(190) NOT NULL, " +
        "message VARCHAR(255) NOT NULL, " +
        "source VARCHAR(32) NOT NULL DEFAULT 'contact', " +
        "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP" +
        ")"
    );
    return true;
};

var canUseNumericId = function (value) {
    return /^\d+$/.test(String(value == null ? "" : value).trim());
};

var createEnquiryInMysql = async function (cleaned) {
    var result = await db.query(
        "INSERT INTO enquiries (full_name, email, phone, address, message, source) VALUES (?,?,?,?,?,?)",
        [cleaned.fullName, cleaned.email, cleaned.phone, cleaned.address, cleaned.message, cleaned.source]
    );
    var info = result && result[0] ? result[0] : {};
    return {
        id: info.insertId,
        fullName: cleaned.fullName,
        email: cleaned.email,
        phone: cleaned.phone,
        address: cleaned.address,
        message: cleaned.message,
        source: cleaned.source,
    };
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

    try {
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
    } catch (error) {
        return createEnquiryInMysql(cleaned);
    }
};

var listEnquiries = async function (limit) {
    var numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit <= 0) {
        numericLimit = DEFAULT_LIMIT;
    }
    if (numericLimit > MAX_LIMIT) {
        numericLimit = MAX_LIMIT;
    }

    try {
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
    } catch (error) {
        var result = await db.query(
            "SELECT id, full_name, email, phone, address, message, source, created_at FROM enquiries ORDER BY created_at DESC LIMIT ?",
            [numericLimit]
        );
        var rows = result && result[0] ? result[0] : [];
        return rows.map(function (row) {
            return {
                id: row.id,
                fullName: row.full_name,
                email: row.email,
                phone: row.phone,
                address: row.address,
                message: row.message,
                source: row.source,
                createdAt: row.created_at,
            };
        });
    }
};

var deleteEnquiry = async function (id) {
    var textId = String(id == null ? "" : id).trim();

    try {
        var result = await EnquiryItem.findByIdAndDelete(textId);
        if (result != null) {
            return true;
        }
    } catch (error) {
        // fall back to MySQL below
    }

    if (!canUseNumericId(textId)) {
        return false;
    }

    var mysqlResult = await db.query("DELETE FROM enquiries WHERE id = ? LIMIT 1", [Number(textId)]);
    var info = mysqlResult && mysqlResult[0] ? mysqlResult[0] : {};
    return Number(info.affectedRows || 0) > 0;
};

var countEnquiries = async function () {
    try {
        return await EnquiryItem.countDocuments();
    } catch (error) {
        var result = await db.query("SELECT COUNT(*) AS total FROM enquiries");
        var rows = result && result[0] ? result[0] : [];
        var row = rows[0] || {};
        return Number(row.total || 0);
    }
};

module.exports = {
    createEnquiry: createEnquiry,
    countEnquiries: countEnquiries,
    deleteEnquiry: deleteEnquiry,
    ensureEnquiriesTable: ensureEnquiriesTable,
    isExampleEmail: isExampleEmail,
    listEnquiries: listEnquiries,
};
