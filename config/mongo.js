var mongoose = require("mongoose");
var activeConnectionPromise = null;
var lastMongoError = null;
var sleep = function (ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
};

var sanitizeMongoUri = function (value) {
    return String(value == null ? "" : value).trim().replace(/^['"]|['"]$/g, "");
};

var resolveMongoUri = function () {
    var candidates = [
        process.env.MONGODB_URI,
        process.env.MONGODB_URL,
        process.env.MONGO_URL,
        process.env.ATLAS_URL,
        process.env.ATLAS_URI,
        process.env.ATLASURL,
        process.env.AtlasUrl,
        process.env.MONGO_URI,
        process.env.DATABASE_URL,
    ];

    for (var i = 0; i < candidates.length; i += 1) {
        var value = sanitizeMongoUri(candidates[i]);
        if (value && /^mongodb(\+srv)?:\/\//i.test(value)) {
            return value;
        }
    }

    return "";
};

var connectMongo = async function () {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (activeConnectionPromise) {
        return activeConnectionPromise;
    }

    var mongoUri = resolveMongoUri();
    if (!mongoUri) {
        var uriError = new Error("MongoDB URI not found. Set MONGODB_URI (or ATLAS_URL/AtlasUrl) in environment variables.");
        uriError.code = "MONGO_URI_MISSING";
        lastMongoError = uriError;
        throw uriError;
    }

    activeConnectionPromise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
        family: 4,
    }).then(function () {
        console.log("Connected to MongoDB");
        lastMongoError = null;
        return mongoose.connection;
    }).catch(function (error) {
        lastMongoError = error;
        console.error("MongoDB connection failed:", error && error.message ? error.message : error);
        throw error;
    }).finally(function () {
        activeConnectionPromise = null;
    });

    return activeConnectionPromise;
};

var getLastMongoError = function () {
    return lastMongoError;
};

var connectMongoWithRetry = async function (maxAttempts, retryDelayMs) {
    var attempts = Number(maxAttempts);
    var delayMs = Number(retryDelayMs);
    if (!Number.isInteger(attempts) || attempts <= 0) {
        attempts = Number(process.env.MONGO_CONNECT_RETRY_ATTEMPTS || 3);
    }
    if (!Number.isFinite(delayMs) || delayMs < 0) {
        delayMs = Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS || 1200);
    }

    var lastError = null;
    for (var attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await connectMongo();
        } catch (error) {
            lastError = error;
            if (error && error.code === "MONGO_URI_MISSING") {
                throw error;
            }
            if (attempt < attempts) {
                await sleep(delayMs);
            }
        }
    }

    throw lastError;
};

module.exports = {
    connectMongo: connectMongo,
    connectMongoWithRetry: connectMongoWithRetry,
    getLastMongoError: getLastMongoError,
    mongoose: mongoose,
};
