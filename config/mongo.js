var mongoose = require("mongoose");
var activeConnectionPromise = null;

var resolveMongoUri = function () {
    var candidates = [
        process.env.MONGODB_URI,
        process.env.ATLAS_URL,
        process.env.AtlasUrl,
        process.env.MONGO_URI,
    ];

    for (var i = 0; i < candidates.length; i += 1) {
        var value = String(candidates[i] || "").trim();
        if (value) {
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
        console.warn("MongoDB URI not found. Set MONGODB_URI (or AtlasUrl) in .env.");
        return null;
    }

    activeConnectionPromise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
    }).then(function () {
        console.log("Connected to MongoDB");
        return mongoose.connection;
    }).catch(function (error) {
        console.error("MongoDB connection failed:", error && error.message ? error.message : error);
        throw error;
    }).finally(function () {
        activeConnectionPromise = null;
    });

    return activeConnectionPromise;
};

module.exports = {
    connectMongo: connectMongo,
    mongoose: mongoose,
};
