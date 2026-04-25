var mongoose = require("mongoose");
var activeConnectionPromise = null;
var lastMongoError = null;

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
        var value = String(candidates[i] || "").trim();
        if (value && /^mongodb(\+srv)?:\/\//i.test(value)) {
            return value.replace(/^"|"$/g, "");
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

module.exports = {
    connectMongo: connectMongo,
    getLastMongoError: getLastMongoError,
    mongoose: mongoose,
};
