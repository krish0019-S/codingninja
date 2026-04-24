var NewsItem = require("../models/NewsItem");

var MAX_CONTENT_LINK_LENGTH = 500;
var MAX_IMAGE_URL_LENGTH = 500;

var toText = function (value) {
    return String(value == null ? "" : value).trim();
};

var createValidationError = function (message) {
    var error = new Error(message);
    error.statusCode = 400;
    return error;
};

var normalizeOptionalUrl = function (value, options) {
    var raw = toText(value);
    var opts = options && typeof options === "object" ? options : {};
    var fieldName = String(opts.fieldName || "URL");
    var maxLength = Number(opts.maxLength || MAX_CONTENT_LINK_LENGTH);
    var throwOnError = opts.throwOnError === true;

    if (!raw) return "";

    if (raw.length > maxLength) {
        if (throwOnError) throw createValidationError(fieldName + " must be " + String(maxLength) + " characters or less.");
        return "";
    }

    if (raw.charAt(0) === "/") return raw;

    if (!/^https?:\/\//i.test(raw)) {
        if (throwOnError) throw createValidationError(fieldName + " must be a valid http/https URL or start with '/'.");
        return "";
    }

    var parsed;
    try {
        parsed = new URL(raw);
    } catch (error) {
        if (throwOnError) throw createValidationError(fieldName + " must be a valid URL.");
        return "";
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        if (throwOnError) throw createValidationError(fieldName + " must use http or https protocol.");
        return "";
    }

    return parsed.toString();
};

var validatePayload = function (payload) {
    var title = toText(payload && payload.title);
    var content = toText(payload && payload.content);
    var contentLink = normalizeOptionalUrl(payload && payload.contentLink, {
        fieldName: "Content link",
        maxLength: MAX_CONTENT_LINK_LENGTH,
        throwOnError: true,
    });
    var imageUrl = normalizeOptionalUrl(payload && payload.imageUrl, {
        fieldName: "Image URL",
        maxLength: MAX_IMAGE_URL_LENGTH,
        throwOnError: true,
    });

    if (title.length < 3 || title.length > 120) {
        throw createValidationError("Title must be between 3 and 120 characters.");
    }

    if (content.length < 8 || content.length > 1210) {
        throw createValidationError("Content must be between 8 and 1210 characters.");
    }

    return {
        title: title,
        content: content,
        contentLink: contentLink,
        imageUrl: imageUrl,
    };
};

var isNewsPaused = async function () {
    // MongoDB migration: we can store this setting in a separate config or just return false for now
    return false;
};

var setNewsPaused = async function (paused) {
    return false; // stubbed
};

var listNewsItems = async function () {
    var items = await NewsItem.find().sort({ sequence: 1 }).lean();
    return items.map(function(item) {
        return {
            id: item._id,
            title: item.title,
            content: item.content,
            contentLink: item.contentLink,
            imageUrl: item.imageUrl,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            sequence: item.sequence
        };
    });
};

var getNewsState = async function () {
    var paused = await isNewsPaused();
    var items = await listNewsItems();
    return { paused: paused, items: items };
};

var createNewsItem = async function (payload) {
    var cleaned = validatePayload(payload);
    
    var lastItem = await NewsItem.findOne().sort({ sequence: -1 });
    var sequence = lastItem ? lastItem.sequence + 1 : 1;
    
    var item = await NewsItem.create({
        title: cleaned.title,
        content: cleaned.content,
        contentLink: cleaned.contentLink,
        imageUrl: cleaned.imageUrl,
        sequence: sequence
    });
    
    return {
        id: item._id,
        title: item.title,
        content: item.content,
        contentLink: item.contentLink,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        sequence: item.sequence
    };
};

var updateNewsItem = async function (id, payload) {
    var cleaned = validatePayload(payload);
    var item = await NewsItem.findByIdAndUpdate(id, {
        title: cleaned.title,
        content: cleaned.content,
        contentLink: cleaned.contentLink,
        imageUrl: cleaned.imageUrl,
    }, { new: true }).lean();
    
    if (!item) return null;
    
    return {
        id: item._id,
        title: item.title,
        content: item.content,
        contentLink: item.contentLink,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        sequence: item.sequence
    };
};

var deleteNewsItem = async function (id) {
    var result = await NewsItem.findByIdAndDelete(id);
    return result != null;
};

var reorderNewsSequence = async function (id, targetSequence) {
    var sequence = Number(targetSequence);
    if (!Number.isInteger(sequence) || sequence < 1) {
        throw createValidationError("Invalid sequence.");
    }
    
    var item = await NewsItem.findById(id);
    if (!item) return null;
    
    var items = await NewsItem.find().sort({ sequence: 1 });
    var currentIndex = items.findIndex(i => i._id.toString() === id.toString());
    
    if (currentIndex < 0) return null;
    if (sequence > items.length) throw createValidationError("Invalid sequence.");
    
    var moving = items.splice(currentIndex, 1)[0];
    items.splice(sequence - 1, 0, moving);
    
    for (let i = 0; i < items.length; i++) {
        items[i].sequence = i + 1;
        await items[i].save();
    }
    
    return listNewsItems();
};

module.exports = {
    createNewsItem: createNewsItem,
    deleteNewsItem: deleteNewsItem,
    getNewsState: getNewsState,
    isNewsPaused: isNewsPaused,
    listNewsItems: listNewsItems,
    reorderNewsSequence: reorderNewsSequence,
    setNewsPaused: setNewsPaused,
    updateNewsItem: updateNewsItem,
};

