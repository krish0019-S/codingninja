var express = require("express");
var fs = require("fs");
var path = require("path");
var jwt = require("jsonwebtoken");
var nodemailer = require("nodemailer");
var multer = require("multer");
var { upload } = require("../middleware/upload");
var adminAuth = require("../middleware/adminAuth");
var fileUploader = require("express-fileupload");
var { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
var { connectMongoWithRetry } = require("../config/mongo");
var db = require("../config/db");
var MediaItem = require("../models/MediaItem");
var PortfolioItem = require("../models/PortfolioItem");
var carouselBanners = require("../utils/carouselBanners");
var enquiries = require("../utils/enquiries");
var newsItems = require("../utils/newsItems");

var router = express.Router();

var JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
var ADMIN_TOKEN_EXPIRES_SECONDS = 30 * 60;
var resetStore = new Map();
var GALLERY_IMAGE_ROOT_DIR = path.join(__dirname, "..", "Public", "images", "gallery");
var GALLERY_FOLDER_ORDER_FILE = path.join(__dirname, "..", "data", "gallery-folder-order.json");
var VIDEO_GALLERY_ROOT_DIR = path.join(__dirname, "..", "Public", "videos", "gallery");
var VIDEO_FOLDER_ORDER_FILE = path.join(__dirname, "..", "data", "video-folder-order.json");
var GALLERY_FOLDER_REGEX = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
var GALLERY_FILE_REGEX = /^[a-z0-9._-]+$/i;
var GALLERY_ALLOWED_EXTS = [".jpg", ".jpeg", ".png"];
var MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
};
var NEWS_MEDIA_DIR = path.join(__dirname, "..", "Public", "news-files");
var NEWS_MEDIA_MAX_SIZE = 3 * 1024 * 1024;
var NEWS_MEDIA_MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
};
var newsMediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: NEWS_MEDIA_MAX_SIZE },
    fileFilter: function (req, file, cb) {
        if (NEWS_MEDIA_MIME_TO_EXT[String(file && file.mimetype || "").toLowerCase()]) {
            return cb(null, true);
        }
        return cb(new Error("Only JPG/PNG/PDF files are allowed."));
    },
});
var VIDEO_ALLOWED_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];
var VIDEO_MIME_TO_EXT = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogg",
    "video/quicktime": ".mov",
    "video/x-m4v": ".m4v",
};
var MAX_VIDEO_SIZE = 8 * 1024 * 1024;
var videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: function (req, file, cb) {
        if (VIDEO_MIME_TO_EXT[String(file && file.mimetype || "").toLowerCase()]) {
            return cb(null, true);
        }
        return cb(new Error("Only MP4/WEBM/OGG/MOV videos are allowed."));
    },
});

var PORTFOLIO_ROOT_DIR = path.join(__dirname, "..", "Public", "portfolio");

var getPortfolioFolderDir = function (category, folderName) {
    var normCat = normalizeFolderName(category);
    var normFolder = normalizeFolderName(folderName);
    if (!normCat || !normFolder) return null;
    var rootDir = path.resolve(PORTFOLIO_ROOT_DIR, normCat);
    var folderDir = path.resolve(rootDir, normFolder);
    if (!folderDir.startsWith(rootDir + path.sep) && folderDir !== rootDir) return null;
    return folderDir;
};

var getPortfolioCategoryDir = function (category) {
    var normCat = normalizeFolderName(category);
    if (!normCat) return null;
    var rootDir = path.resolve(PORTFOLIO_ROOT_DIR);
    var categoryDir = path.resolve(PORTFOLIO_ROOT_DIR, normCat);
    if (!categoryDir.startsWith(rootDir + path.sep) && categoryDir !== rootDir) return null;
    return categoryDir;
};

var getPortfolioOrderFile = function(category) {
    var normCat = normalizeFolderName(category);
    if (!normCat) return null;
    return path.join(__dirname, "..", "data", "portfolio-order-" + normCat + ".json");
};

var readPortfolioFolderOrder = async function (category) {
    var orderFile = getPortfolioOrderFile(category);
    if (!orderFile) return [];
    try {
        var raw = await fs.promises.readFile(orderFile, "utf8");
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.order) ? parsed.order : []);
        var seen = new Set();
        var normalized = [];

        list.forEach(function (name) {
            var folderName = normalizeFolderName(name);
            var key = folderKey(folderName);
            if (folderName && !seen.has(key)) {
                seen.add(key);
                normalized.push(folderName);
            }
        });

        return normalized;
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return [];
        }
        console.error(error);
        return [];
    }
};

var writePortfolioFolderOrder = async function (category, order) {
    var orderFile = getPortfolioOrderFile(category);
    if (!orderFile) throw new Error("Invalid category.");

    var source = Array.isArray(order) ? order : [];
    var seen = new Set();
    var normalized = [];

    source.forEach(function (name) {
        var folderName = normalizeFolderName(name);
        var key = folderKey(folderName);
        if (folderName && !seen.has(key)) {
            seen.add(key);
            normalized.push(folderName);
        }
    });

    await fs.promises.mkdir(path.dirname(orderFile), { recursive: true });
    await fs.promises.writeFile(
        orderFile,
        JSON.stringify({ order: normalized }, null, 2),
        "utf8"
    );
    return normalized;
};

var syncPortfolioFolderOrder = async function (category, folders) {
    var physicalFolders = Array.isArray(folders) ? folders.slice() : [];
    var physicalMap = buildFolderMap(physicalFolders);
    var currentOrder = await readPortfolioFolderOrder(category);
    var merged = [];
    var used = new Set();

    currentOrder.forEach(function (name) {
        var normalized = normalizeFolderName(name);
        var key = folderKey(normalized);
        if (physicalMap.has(key) && !used.has(key)) {
            merged.push(physicalMap.get(key));
            used.add(key);
        }
    });

    physicalMap.forEach(function (value, key) {
        if (!used.has(key)) {
            merged.push(value);
            used.add(key);
        }
    });

    var changed =
        merged.length !== currentOrder.length ||
        merged.some(function (name, index) {
            return folderKey(currentOrder[index]) !== folderKey(name);
        });

    if (changed) {
        await writePortfolioFolderOrder(category, merged);
    }

    return merged;
};

var serializeMediaItem = function (item) {
    if (!item) {
        return null;
    }

    return {
        id: String(item._id || ""),
        url: String(item.url || ""),
        folder: String(item.folder || "rudraksh_media"),
        folderUrl: String(item.folderUrl || ""),
        type: String(item.type || "image"),
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    };
};

var normalizeResourceType = function (value) {
    var text = String(value || "").trim().toLowerCase();
    if (text === "image" || text === "video" || text === "raw") {
        return text;
    }
    return "auto";
};

var normalizeCloudinaryFolder = function (value) {
    var text = String(value || "").trim();
    if (!text) {
        return "rudraksh_media";
    }

    var cleaned = text
        .replace(/\\/g, "/")
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\/{2,}/g, "/");

    if (!/^[a-zA-Z0-9/_-]{1,120}$/.test(cleaned)) {
        return "rudraksh_media";
    }

    return cleaned;
};

var buildCloudinaryFolderUrl = function (secureUrl) {
    var url = String(secureUrl || "").trim();
    if (!url) {
        return "";
    }

    var parts = url.split("/");
    if (parts.length <= 1) {
        return "";
    }

    parts.pop();
    return parts.join("/");
};

var ensureMongoReady = async function () {
    await connectMongoWithRetry();
};

router.get("/test-config", adminAuth, async function (req, res) {
    var mongoStatus = "Checking...";
    try {
        const { connectMongo } = require("../config/mongo");
        const conn = await connectMongo();
        mongoStatus = conn ? "Connected (Ready)" : "Failed (No connection)";
    } catch (e) {
        mongoStatus = "Error: " + e.message;
    }

    return res.json({
        ok: true,
        cloudinary: {
            isConfigured: isCloudinaryConfigured,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME ? "Found" : "Missing",
            apiKey: process.env.CLOUDINARY_API_KEY ? "Found" : "Missing",
            apiSecret: process.env.CLOUDINARY_API_SECRET ? "Found" : "Missing"
        },
        mongodb: mongoStatus,
        environment: process.env.NODE_ENV || "development"
    });
});

router.get("/media", adminAuth, async function (req, res) {
    try {
        await ensureMongoReady();
        var media = await MediaItem.find({}).sort({ createdAt: -1 }).lean();
        return res.json({
            ok: true,
            media: media.map(serializeMediaItem).filter(Boolean),
        });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to load media." });
    }
});

router.post("/save-media", adminAuth, async function (req, res) {
    var url = getRequestValue(req, "url");
    var type = getRequestValue(req, "type") || "image"; // 'image' or 'video'
    if (!url) return res.status(400).json({ ok: false, message: "URL is required." });

    try {
        await ensureMongoReady();
        var normalizedType = String(type).toLowerCase() === "video" ? "video" : "image";
        var folder = normalizeCloudinaryFolder(getRequestValue(req, "folder"));
        var folderUrl = String(getRequestValue(req, "folderUrl") || "").trim() || buildCloudinaryFolderUrl(url);
        var item = await MediaItem.create({
            url: String(url).trim(),
            folder: folder,
            folderUrl: folderUrl,
            type: normalizedType,
            publicId: String(getRequestValue(req, "publicId") || "").trim(),
            resourceType: normalizeResourceType(getRequestValue(req, "resourceType")),
        });
        return res.json({ ok: true, message: "Media saved successfully.", item: serializeMediaItem(item) });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to save media." });
    }
});

router.delete("/media/:id", adminAuth, async function(req, res) {
    var id = String(req.params.id || "").trim();
    if (!id) {
        return res.status(400).json({ ok: false, message: "Invalid media id." });
    }

    try {
        await ensureMongoReady();
        var item = await MediaItem.findById(id);
        if (!item) {
            return res.status(404).json({ ok: false, message: "Media not found." });
        }

        if (item.publicId) {
            await cloudinary.uploader.destroy(String(item.publicId), {
                resource_type: String(item.resourceType || "auto"),
            }).catch(function () { });
        }

        await MediaItem.deleteOne({ _id: item._id });
        return res.json({ ok: true, message: "Media deleted successfully." });
    } catch(e) {
        if (e && e.name === "CastError") {
            return res.status(400).json({ ok: false, message: "Invalid media id." });
        }
        return res.status(500).json({ ok: false, message: "Unable to delete media." });
    }
});

router.post("/cloudinary-upload", adminAuth, fileUploader({ 
    useTempFiles: true, 
    tempFileDir: "/tmp/",
    createParentPath: true 
}), async function (req, res) {
    if (!isCloudinaryConfigured) {
        return res.status(500).json({ ok: false, message: "Cloudinary is not configured on server." });
    }

    if (!req.files || !req.files.file) {
        return res.status(400).json({ ok: false, message: "No file uploaded." });
    }

    var file = req.files.file;
    var isImage = String(file.mimetype || "").startsWith("image/");
    var folder = normalizeCloudinaryFolder(getRequestValue(req, "folder"));
    var uploadedResult = null;

    try {
        console.log("[Cloudinary] Starting upload for:", file.name, "to folder:", folder);
        
        // Upload to Cloudinary using the file path provided by useTempFiles
        uploadedResult = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: "auto",
            folder: folder
        });

        var secureUrl = String(uploadedResult.secure_url || "").trim();
        var folderUrl = buildCloudinaryFolderUrl(secureUrl);

        console.log("[Cloudinary] Upload success:", secureUrl);

        await ensureMongoReady();

        // Save metadata to MongoDB
        var item = await MediaItem.create({
            url: secureUrl,
            folder: folder,
            folderUrl: folderUrl,
            type: isImage ? "image" : "video",
            publicId: String(uploadedResult.public_id || "").trim(),
            resourceType: normalizeResourceType(uploadedResult.resource_type),
        });

        console.log("[MongoDB] Record saved with ID:", item._id);

        return res.json({ 
            ok: true, 
            message: "Media saved successfully to Cloud and Database.", 
            item: serializeMediaItem(item) 
        });

    } catch (error) {
        console.error("[Upload Error]", error);

        if (uploadedResult && uploadedResult.public_id) {
            try {
                await cloudinary.uploader.destroy(String(uploadedResult.public_id), {
                    resource_type: normalizeResourceType(uploadedResult.resource_type),
                });
            } catch (cleanupError) {
                console.error("[Upload Cleanup Error]", cleanupError);
            }
        }

        var msg = error.message || "Upload failed.";
        if (error.http_code) msg = "Cloudinary Error (" + error.http_code + "): " + msg;
        
        return res.status(500).json({ 
            ok: false, 
            message: msg 
        });
    }
});

var listPortfolioFoldersOrdered = async function (category) {
    var folders = await listPortfolioFolders(category);
    return syncPortfolioFolderOrder(category, folders);
};

var reorderPortfolioFolderSequence = async function (category, folderName, targetSequence) {
    var normalizedName = normalizeFolderName(folderName);
    if (!normalizedName) {
        throw new Error("Invalid folder name.");
    }
    if (!Number.isInteger(targetSequence) || targetSequence < 1) {
        throw new Error("Invalid sequence.");
    }

    var physicalFolders = await listPortfolioFolders(category);
    var physicalMap = buildFolderMap(physicalFolders);
    var key = folderKey(normalizedName);
    if (!physicalMap.has(key)) {
        throw new Error("Folder not found.");
    }

    var orderedFolders = await syncPortfolioFolderOrder(category, physicalFolders);
    var currentIndex = orderedFolders.findIndex(function (name) {
        return folderKey(name) === key;
    });
    if (currentIndex === -1) {
        throw new Error("Folder not found.");
    }

    var clampedIndex = Math.max(0, Math.min(targetSequence - 1, orderedFolders.length - 1));
    if (currentIndex !== clampedIndex) {
        var actualName = physicalMap.get(key);
        orderedFolders.splice(currentIndex, 1);
        orderedFolders.splice(clampedIndex, 0, actualName);
        await writePortfolioFolderOrder(category, orderedFolders);
    }

    return orderedFolders;
};

var getPortfolioFileOrderFile = function (category, folder) {
    var normCat = normalizeFolderName(category);
    var normFolder = normalizeFolderName(folder);
    if (!normCat || !normFolder) return null;
    return path.join(__dirname, "..", "data", "portfolio-files-order-" + normCat + "-" + normFolder + ".json");
};

var getPortfolioCoverMapFile = function (category) {
    var normCat = normalizeFolderName(category);
    if (!normCat) return null;
    return path.join(__dirname, "..", "data", "portfolio-cover-" + normCat + ".json");
};

var readPortfolioCoverMap = async function (category) {
    var coverFile = getPortfolioCoverMapFile(category);
    if (!coverFile) return {};
    try {
        var raw = await fs.promises.readFile(coverFile, "utf8");
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
        return {};
    } catch (error) {
        if (error && error.code === "ENOENT") return {};
        throw error;
    }
};

var writePortfolioCoverMap = async function (category, map) {
    var coverFile = getPortfolioCoverMapFile(category);
    if (!coverFile) return;
    var safe = map && typeof map === "object" && !Array.isArray(map) ? map : {};
    await fs.promises.mkdir(path.dirname(coverFile), { recursive: true });
    await fs.promises.writeFile(coverFile, JSON.stringify(safe, null, 2), "utf8");
};

var getPortfolioCoverFileName = async function (category, folder) {
    var normFolder = normalizeFolderName(folder);
    if (!normFolder) return "";
    var coverMap = await readPortfolioCoverMap(category);
    var name = coverMap[folderKey(normFolder)];
    if (!name) return "";
    return String(name || "").trim();
};

var setPortfolioCoverFileName = async function (category, folder, fileName) {
    var normFolder = normalizeFolderName(folder);
    if (!normFolder) throw new Error("Invalid folder.");
    var nextFileName = String(fileName || "").trim();
    if (!nextFileName || !GALLERY_FILE_REGEX.test(nextFileName)) {
        throw new Error("Invalid file name.");
    }

    var coverMap = await readPortfolioCoverMap(category);
    coverMap[folderKey(normFolder)] = nextFileName;
    await writePortfolioCoverMap(category, coverMap);
    return nextFileName;
};

var clearPortfolioCoverFileName = async function (category, folder) {
    var normFolder = normalizeFolderName(folder);
    if (!normFolder) return;
    var coverMap = await readPortfolioCoverMap(category);
    var key = folderKey(normFolder);
    if (coverMap[key] != null) {
        delete coverMap[key];
        await writePortfolioCoverMap(category, coverMap);
    }
};

var resolvePortfolioCoverFile = async function (category, folder, files) {
    var coverName = await getPortfolioCoverFileName(category, folder);
    var list = Array.isArray(files) ? files : [];
    var matched = coverName
        ? list.find(function (f) { return String(f && f.name || "") === coverName; })
        : null;

    if (matched) return matched;

    if (coverName) {
        await clearPortfolioCoverFileName(category, folder);
    }

    return list.length ? list[list.length - 1] : null;
};

var readPortfolioFileOrder = async function (category, folder) {
    var orderFile = getPortfolioFileOrderFile(category, folder);
    if (!orderFile) return [];
    try {
        var raw = await fs.promises.readFile(orderFile, "utf8");
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.order) ? parsed.order : []);
        var seen = new Set();
        var normalized = [];
        list.forEach(function (name) {
            if (name && !seen.has(name)) {
                seen.add(name);
                normalized.push(name);
            }
        });
        return normalized;
    } catch (error) {
        if (error && error.code === "ENOENT") return [];
        console.error(error);
        return [];
    }
};

var writePortfolioFileOrder = async function (category, folder, order) {
    var orderFile = getPortfolioFileOrderFile(category, folder);
    if (!orderFile) throw new Error("Invalid category or folder.");
    var source = Array.isArray(order) ? order : [];
    var seen = new Set();
    var normalized = [];
    source.forEach(function (name) {
        if (name && !seen.has(name)) {
            seen.add(name);
            normalized.push(name);
        }
    });
    await fs.promises.mkdir(path.dirname(orderFile), { recursive: true });
    await fs.promises.writeFile(orderFile, JSON.stringify({ order: normalized }, null, 2), "utf8");
    return normalized;
};

var syncPortfolioFileOrder = async function (category, folder, files) {
    var physicalFiles = Array.isArray(files) ? files.slice() : [];
    var physicalFileNames = physicalFiles.map(function(f) { return f.name; });
    var physicalMap = new Map(physicalFileNames.map(function(name) { return [name, name]; }));
    
    var currentOrder = await readPortfolioFileOrder(category, folder);
    var merged = [];
    var used = new Set();

    currentOrder.forEach(function (name) {
        if (physicalMap.has(name) && !used.has(name)) {
            merged.push(name);
            used.add(name);
        }
    });

    physicalFileNames.forEach(function (name) {
        if (!used.has(name)) {
            merged.push(name);
        }
    });

    var changed = merged.length !== currentOrder.length || merged.some(function (name, index) {
        return currentOrder[index] !== name;
    });

    if (changed) {
        await writePortfolioFileOrder(category, folder, merged);
    }
    
    var fileMap = new Map(physicalFiles.map(function(f) { return [f.name, f]; }));
    return merged.map(function(name) { return fileMap.get(name); }).filter(Boolean);
};

var readPortfolioDB = async function () {
    try {
        var items = await PortfolioItem.find({}).lean();
        return items.map(function(item) {
            return {
                id: item._id,
                category: item.category,
                folder: item.folder,
                name: item.name,
                path: item.path,
                public_id: item.public_id,
                size: item.size,
                createdAt: item.createdAt
            };
        });
    } catch (e) {
        console.error("Mongo Portfolio Read Error:", e);
        return [];
    }
};

var writePortfolioDB = async function (data) {
    // Note: With MongoDB, we usually update items individually.
    // However, for compatibility with the existing logic that passes an entire array:
    // We will assume this is only called when we NEED to sync something specific.
    // In most cases, we'll use PortfolioItem.create or PortfolioItem.deleteOne directly.
    return; 
};

var listPortfolioFilesOrdered = async function (category, folderName) {
    var files = await listPortfolioFiles(category, folderName);
    return syncPortfolioFileOrder(category, folderName, files);
};

var reorderPortfolioFileSequence = async function (category, folder, fileName, targetSequence) {
    if (!Number.isInteger(targetSequence) || targetSequence < 1) throw new Error("Invalid sequence.");
    var files = await listPortfolioFiles(category, folder);
    var fileNames = files.map(function(f) { return f.name; });
    if (!fileNames.includes(fileName)) throw new Error("File not found.");
    var orderedFiles = await readPortfolioFileOrder(category, folder);
    fileNames.forEach(function(name) { if (!orderedFiles.includes(name)) orderedFiles.push(name); });
    orderedFiles = orderedFiles.filter(function(name) { return fileNames.includes(name); });
    var currentIndex = orderedFiles.indexOf(fileName);
    if (currentIndex === -1) throw new Error("File not found in order list.");
    var clampedIndex = Math.max(0, Math.min(targetSequence - 1, orderedFiles.length - 1));
    if (currentIndex !== clampedIndex) {
        orderedFiles.splice(currentIndex, 1);
        orderedFiles.splice(clampedIndex, 0, fileName);
        await writePortfolioFileOrder(category, folder, orderedFiles);
    }
    return orderedFiles;
};

var listPortfolioFolders = async function (category) {
    var normCat = normalizeFolderName(category);
    if (!normCat) return [];
    var categoryDir = getPortfolioCategoryDir(normCat);
    if (!categoryDir) return [];

    await fs.promises.mkdir(categoryDir, { recursive: true });
    var entries = await fs.promises.readdir(categoryDir, { withFileTypes: true });
    return entries
        .filter(function (entry) {
            return entry.isDirectory() && GALLERY_FOLDER_REGEX.test(entry.name);
        })
        .map(function (entry) {
            return String(entry.name);
        })
        .sort();
};

var listPortfolioFiles = async function (category, folderName) {
    var normCat = normalizeFolderName(category);
    var normFolder = normalizeFolderName(folderName);
    if (!normCat || !normFolder) throw new Error("Invalid folder.");

    var folderDir = getPortfolioFolderDir(normCat, normFolder);
    if (!folderDir) throw new Error("Invalid folder.");

    await fs.promises.mkdir(folderDir, { recursive: true });
    var entries = await fs.promises.readdir(folderDir, { withFileTypes: true });
    var fileEntries = entries.filter(function (entry) {
        if (!entry.isFile() || !GALLERY_FILE_REGEX.test(entry.name)) {
            return false;
        }
        var ext = path.extname(entry.name).toLowerCase();
        return PORTFOLIO_ALLOWED_EXTS.has(ext);
    });

    var files = await Promise.all(fileEntries.map(async function (entry) {
        var fullPath = path.join(folderDir, entry.name);
        var stat = await fs.promises.stat(fullPath).catch(function () {
            return null;
        });
        var createdAt = stat && stat.mtime ? stat.mtime : new Date();
        return {
            id: normCat + ":" + normFolder + ":" + entry.name,
            category: normCat,
            folder: normFolder,
            name: entry.name,
            path: "/portfolio/" + normCat + "/" + normFolder + "/" + entry.name,
            public_id: "",
            size: stat && Number.isFinite(stat.size) ? stat.size : 0,
            createdAt: createdAt.toISOString(),
        };
    }));

    return files
        .filter(Boolean)
        .sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
};

var renamePortfolioFile = async function (category, folder, oldName, newNameBase) {
    var normCat = normalizeFolderName(category);
    var normFolder = normalizeFolderName(folder);
    if (!normCat || !normFolder) throw new Error("Invalid folder.");
    var ext = path.extname(oldName);
    if (!ext) throw new Error("File has no extension.");
    var sanitizedNewBase = sanitizeImageBaseName(newNameBase);
    if (!sanitizedNewBase) throw new Error("Invalid new file name.");
    var finalNewName = sanitizedNewBase + ext;
    if (oldName === finalNewName) return { oldName: oldName, newName: finalNewName };
    
    var dbData = await readPortfolioDB();
    var fileItem = dbData.find(function(item) {
        return item.category === normCat && item.folder === normFolder && item.name === oldName;
    });
    if (!fileItem) throw new Error("File not found.");
    
    var exists = dbData.find(function(item) {
        return item.category === normCat && item.folder === normFolder && item.name === finalNewName;
    });
    if (exists) throw new Error("A file with the new name already exists.");
    
    fileItem.name = finalNewName;
    await writePortfolioDB(dbData);

    var order = await readPortfolioFileOrder(category, folder);
    var orderIndex = order.indexOf(oldName);
    if (orderIndex > -1) {
        order[orderIndex] = finalNewName;
        await writePortfolioFileOrder(category, folder, order);
    }
    return { oldName: oldName, newName: finalNewName };
};

var PORTFOLIO_MAX_SIZE = 50 * 1024 * 1024; // 50MB total for safety
var PORTFOLIO_IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB per image
var PORTFOLIO_MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogg",
    "video/quicktime": ".mov",
    "video/x-m4v": ".m4v",
};
var PORTFOLIO_ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".mp4", ".webm", ".ogg", ".mov", ".m4v"]);

var isValidEmail = function (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

var normalizeEmail = function (email) {
    return String(email || "").trim().toLowerCase();
};

var getRequestBody = function (req) {
    if (req && typeof req.body === "object" && req.body !== null) {
        return req.body;
    }
    return {};
};

var getRequestValue = function (req, key) {
    var body = getRequestBody(req);
    if (body[key] != null) {
        return body[key];
    }
    return "";
};

var isUploadValidationError = function (message) {
    return (
        message === "Invalid banner name." ||
        message === "Only JPG/PNG images are allowed." ||
        message === "Invalid image file."
    );
};

var normalizeFolderName = function (name) {
    var raw = String(name || "")
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!raw || !GALLERY_FOLDER_REGEX.test(raw)) {
        return "";
    }
    return raw;
};

var folderKey = function (name) {
    return String(name || "").toLowerCase();
};

var buildFolderMap = function (folders) {
    var map = new Map();
    (Array.isArray(folders) ? folders : []).forEach(function (name) {
        var normalized = normalizeFolderName(name);
        if (!normalized) {
            return;
        }
        var key = folderKey(normalized);
        if (!map.has(key)) {
            map.set(key, normalized);
        }
    });
    return map;
};

var getFolderNameFromReq = function (req) {
    var body = getRequestBody(req);
    var raw = "";

    if (req && req.query && typeof req.query === "object" && req.query.folder != null) {
        raw = req.query.folder;
    } else if (body.folder != null) {
        raw = body.folder;
    }

    return normalizeFolderName(raw);
};

var sanitizeImageBaseName = function (name) {
    var value = String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!value) {
        return "image";
    }

    return value.slice(0, 60);
};

var ensureGalleryRootDir = async function () {
    await fs.promises.mkdir(GALLERY_IMAGE_ROOT_DIR, { recursive: true });
};

var ensureNewsMediaDir = async function () {
    await fs.promises.mkdir(NEWS_MEDIA_DIR, { recursive: true });
};

var getGalleryFolderDir = function (folderName) {
    var normalized = normalizeFolderName(folderName);
    if (!normalized) {
        return null;
    }

    var rootDir = path.resolve(GALLERY_IMAGE_ROOT_DIR);
    var folderDir = path.resolve(GALLERY_IMAGE_ROOT_DIR, normalized);
    if (!folderDir.startsWith(rootDir + path.sep) && folderDir !== rootDir) {
        return null;
    }

    return folderDir;
};

var ensureGalleryFolderDir = async function (folderName) {
    var folderDir = getGalleryFolderDir(folderName);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureGalleryRootDir();
    await fs.promises.mkdir(folderDir, { recursive: true });
    return folderDir;
};

var listGalleryFolders = async function () {
    await ensureGalleryRootDir();
    var entries = await fs.promises.readdir(GALLERY_IMAGE_ROOT_DIR, { withFileTypes: true });

    return entries
        .filter(function (entry) {
            return entry.isDirectory() && GALLERY_FOLDER_REGEX.test(entry.name);
        })
        .map(function (entry) {
            return String(entry.name);
        })
        .sort();
};

var readGalleryFolderOrder = async function () {
    try {
        var raw = await fs.promises.readFile(GALLERY_FOLDER_ORDER_FILE, "utf8");
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.order) ? parsed.order : []);
        var seen = new Set();
        var normalized = [];

        list.forEach(function (name) {
            var folderName = normalizeFolderName(name);
            var key = folderKey(folderName);
            if (folderName && !seen.has(key)) {
                seen.add(key);
                normalized.push(folderName);
            }
        });

        return normalized;
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return [];
        }
        console.error(error);
        return [];
    }
};

var writeGalleryFolderOrder = async function (order) {
    var source = Array.isArray(order) ? order : [];
    var seen = new Set();
    var normalized = [];

    source.forEach(function (name) {
        var folderName = normalizeFolderName(name);
        var key = folderKey(folderName);
        if (folderName && !seen.has(key)) {
            seen.add(key);
            normalized.push(folderName);
        }
    });

    await fs.promises.mkdir(path.dirname(GALLERY_FOLDER_ORDER_FILE), { recursive: true });
    await fs.promises.writeFile(
        GALLERY_FOLDER_ORDER_FILE,
        JSON.stringify({ order: normalized }, null, 2),
        "utf8"
    );
    return normalized;
};

var syncGalleryFolderOrder = async function (folders) {
    var physicalFolders = Array.isArray(folders) ? folders.slice() : [];
    var physicalMap = buildFolderMap(physicalFolders);
    var currentOrder = await readGalleryFolderOrder();
    var merged = [];
    var used = new Set();

    currentOrder.forEach(function (name) {
        var normalized = normalizeFolderName(name);
        var key = folderKey(normalized);
        if (physicalMap.has(key) && !used.has(key)) {
            merged.push(physicalMap.get(key));
            used.add(key);
        }
    });

    physicalMap.forEach(function (value, key) {
        if (!used.has(key)) {
            merged.push(value);
            used.add(key);
        }
    });

    var changed =
        merged.length !== currentOrder.length ||
        merged.some(function (name, index) {
            return folderKey(currentOrder[index]) !== folderKey(name);
        });

    if (changed) {
        await writeGalleryFolderOrder(merged);
    }

    return merged;
};

var listGalleryFoldersOrdered = async function () {
    var folders = await listGalleryFolders();
    return syncGalleryFolderOrder(folders);
};

var reorderGalleryFolderSequence = async function (folderName, targetSequence) {
    var normalizedName = normalizeFolderName(folderName);
    if (!normalizedName) {
        throw new Error("Invalid folder name.");
    }
    if (!Number.isInteger(targetSequence) || targetSequence < 1) {
        throw new Error("Invalid sequence.");
    }

    var physicalFolders = await listGalleryFolders();
    var physicalMap = buildFolderMap(physicalFolders);
    var key = folderKey(normalizedName);
    if (!physicalMap.has(key)) {
        throw new Error("Folder not found.");
    }

    var orderedFolders = await syncGalleryFolderOrder(physicalFolders);
    var currentIndex = orderedFolders.findIndex(function (name) {
        return folderKey(name) === key;
    });
    if (currentIndex === -1) {
        throw new Error("Folder not found.");
    }

    var clampedIndex = Math.max(0, Math.min(targetSequence - 1, orderedFolders.length - 1));
    if (currentIndex !== clampedIndex) {
        var actualName = physicalMap.get(key);
        orderedFolders.splice(currentIndex, 1);
        orderedFolders.splice(clampedIndex, 0, actualName);
        await writeGalleryFolderOrder(orderedFolders);
    }

    return orderedFolders;
};

var listGalleryImages = async function (folderName) {
    var normalizedFolder = normalizeFolderName(folderName);
    if (!normalizedFolder) {
        throw new Error("Invalid folder name.");
    }

    var folderDir = getGalleryFolderDir(normalizedFolder);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureGalleryRootDir();

    var stats;
    try {
        stats = await fs.promises.stat(folderDir);
    } catch (error) {
        if (error && error.code === "ENOENT") {
            throw new Error("Folder not found.");
        }
        throw error;
    }

    if (!stats.isDirectory()) {
        throw new Error("Folder not found.");
    }

    var entries = await fs.promises.readdir(folderDir, { withFileTypes: true });

    var files = entries
        .filter(function (entry) {
            if (!entry.isFile()) {
                return false;
            }
            var ext = path.extname(entry.name).toLowerCase();
            return GALLERY_FILE_REGEX.test(entry.name) && GALLERY_ALLOWED_EXTS.includes(ext);
        })
        .map(function (entry) {
            return entry.name;
        });

    var details = await Promise.all(
        files.map(async function (fileName) {
            var filePath = path.join(folderDir, fileName);
            var stat = await fs.promises.stat(filePath);
            return {
                name: fileName,
                folder: normalizedFolder,
                path: "/images/gallery/" + normalizedFolder + "/" + fileName,
                size: stat.size,
                createdAt: stat.birthtime || stat.mtime,
            };
        })
    );

    return details.sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

var buildGalleryFolderCards = async function (onlyWithImages) {
    var folders = await listGalleryFoldersOrdered();

    var cards = await Promise.all(
        folders.map(async function (folder) {
            var images = await listGalleryImages(folder);
            var coverImage = images.length ? images[images.length - 1] : null;
            return {
                name: folder,
                imageCount: images.length,
                coverPath: coverImage ? coverImage.path : "",
            };
        })
    );

    var filtered = cards;
    if (onlyWithImages) {
        filtered = cards.filter(function (item) {
            return item.imageCount > 0;
        });
    }

    return filtered;
};

var ensureVideoGalleryRootDir = async function () {
    await fs.promises.mkdir(VIDEO_GALLERY_ROOT_DIR, { recursive: true });
};

var getVideoGalleryFolderDir = function (folderName) {
    var normalized = normalizeFolderName(folderName);
    if (!normalized) {
        return null;
    }

    var rootDir = path.resolve(VIDEO_GALLERY_ROOT_DIR);
    var folderDir = path.resolve(VIDEO_GALLERY_ROOT_DIR, normalized);
    if (!folderDir.startsWith(rootDir + path.sep) && folderDir !== rootDir) {
        return null;
    }

    return folderDir;
};

var ensureVideoGalleryFolderDir = async function (folderName) {
    var folderDir = getVideoGalleryFolderDir(folderName);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureVideoGalleryRootDir();
    await fs.promises.mkdir(folderDir, { recursive: true });
    return folderDir;
};

var listVideoGalleryFolders = async function () {
    await ensureVideoGalleryRootDir();
    var entries = await fs.promises.readdir(VIDEO_GALLERY_ROOT_DIR, { withFileTypes: true });

    return entries
        .filter(function (entry) {
            return entry.isDirectory() && GALLERY_FOLDER_REGEX.test(entry.name);
        })
        .map(function (entry) {
            return String(entry.name);
        })
        .sort();
};

var readVideoFolderOrder = async function () {
    try {
        var raw = await fs.promises.readFile(VIDEO_FOLDER_ORDER_FILE, "utf8");
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.order) ? parsed.order : []);
        var seen = new Set();
        var normalized = [];

        list.forEach(function (name) {
            var folderName = normalizeFolderName(name);
            var key = folderKey(folderName);
            if (folderName && !seen.has(key)) {
                seen.add(key);
                normalized.push(folderName);
            }
        });

        return normalized;
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return [];
        }
        console.error(error);
        return [];
    }
};

var writeVideoFolderOrder = async function (order) {
    var source = Array.isArray(order) ? order : [];
    var seen = new Set();
    var normalized = [];

    source.forEach(function (name) {
        var folderName = normalizeFolderName(name);
        var key = folderKey(folderName);
        if (folderName && !seen.has(key)) {
            seen.add(key);
            normalized.push(folderName);
        }
    });

    await fs.promises.mkdir(path.dirname(VIDEO_FOLDER_ORDER_FILE), { recursive: true });
    await fs.promises.writeFile(
        VIDEO_FOLDER_ORDER_FILE,
        JSON.stringify({ order: normalized }, null, 2),
        "utf8"
    );
    return normalized;
};

var syncVideoFolderOrder = async function (folders) {
    var physicalFolders = Array.isArray(folders) ? folders.slice() : [];
    var physicalMap = buildFolderMap(physicalFolders);
    var currentOrder = await readVideoFolderOrder();
    var merged = [];
    var used = new Set();

    currentOrder.forEach(function (name) {
        var normalized = normalizeFolderName(name);
        var key = folderKey(normalized);
        if (physicalMap.has(key) && !used.has(key)) {
            merged.push(physicalMap.get(key));
            used.add(key);
        }
    });

    physicalMap.forEach(function (value, key) {
        if (!used.has(key)) {
            merged.push(value);
            used.add(key);
        }
    });

    var changed =
        merged.length !== currentOrder.length ||
        merged.some(function (name, index) {
            return folderKey(currentOrder[index]) !== folderKey(name);
        });

    if (changed) {
        await writeVideoFolderOrder(merged);
    }

    return merged;
};

var listVideoGalleryFoldersOrdered = async function () {
    var folders = await listVideoGalleryFolders();
    return syncVideoFolderOrder(folders);
};

var reorderVideoFolderSequence = async function (folderName, targetSequence) {
    var normalizedName = normalizeFolderName(folderName);
    if (!normalizedName) {
        throw new Error("Invalid folder name.");
    }
    if (!Number.isInteger(targetSequence) || targetSequence < 1) {
        throw new Error("Invalid sequence.");
    }

    var physicalFolders = await listVideoGalleryFolders();
    var physicalMap = buildFolderMap(physicalFolders);
    var key = folderKey(normalizedName);
    if (!physicalMap.has(key)) {
        throw new Error("Folder not found.");
    }

    var orderedFolders = await syncVideoFolderOrder(physicalFolders);
    var currentIndex = orderedFolders.findIndex(function (name) {
        return folderKey(name) === key;
    });
    if (currentIndex === -1) {
        throw new Error("Folder not found.");
    }

    var clampedIndex = Math.max(0, Math.min(targetSequence - 1, orderedFolders.length - 1));
    if (currentIndex !== clampedIndex) {
        var actualName = physicalMap.get(key);
        orderedFolders.splice(currentIndex, 1);
        orderedFolders.splice(clampedIndex, 0, actualName);
        await writeVideoFolderOrder(orderedFolders);
    }

    return orderedFolders;
};

var listVideoGalleryFiles = async function (folderName) {
    var normalizedFolder = normalizeFolderName(folderName);
    if (!normalizedFolder) {
        throw new Error("Invalid folder name.");
    }

    var folderDir = getVideoGalleryFolderDir(normalizedFolder);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureVideoGalleryRootDir();

    var stats;
    try {
        stats = await fs.promises.stat(folderDir);
    } catch (error) {
        if (error && error.code === "ENOENT") {
            throw new Error("Folder not found.");
        }
        throw error;
    }

    if (!stats.isDirectory()) {
        throw new Error("Folder not found.");
    }

    var entries = await fs.promises.readdir(folderDir, { withFileTypes: true });

    var files = entries
        .filter(function (entry) {
            if (!entry.isFile()) {
                return false;
            }
            var ext = path.extname(entry.name).toLowerCase();
            return GALLERY_FILE_REGEX.test(entry.name) && VIDEO_ALLOWED_EXTS.includes(ext);
        })
        .map(function (entry) {
            return entry.name;
        });

    var details = await Promise.all(
        files.map(async function (fileName) {
            var filePath = path.join(folderDir, fileName);
            var stat = await fs.promises.stat(filePath);
            return {
                name: fileName,
                folder: normalizedFolder,
                path: "/videos/gallery/" + normalizedFolder + "/" + fileName,
                size: stat.size,
                createdAt: stat.birthtime || stat.mtime,
            };
        })
    );

    return details.sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

var buildVideoFolderCards = async function (onlyWithVideos) {
    var folders = await listVideoGalleryFoldersOrdered();

    var cards = await Promise.all(
        folders.map(async function (folder) {
            var videos = await listVideoGalleryFiles(folder);
            var coverVideo = videos.length ? videos[videos.length - 1] : null;
            return {
                name: folder,
                videoCount: videos.length,
                coverPath: coverVideo ? coverVideo.path : "",
            };
        })
    );

    var filtered = cards;
    if (onlyWithVideos) {
        filtered = cards.filter(function (item) {
            return item.videoCount > 0;
        });
    }

    return filtered;
};

var smtpHost = process.env.SMTP_HOST || "";
var smtpPort = Number(process.env.SMTP_PORT || 587);
var smtpSecure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
if (!process.env.SMTP_SECURE && smtpPort === 465) {
    smtpSecure = true;
}
var smtpUser = process.env.SMTP_USER || "krishtanwar153@gmail.com";
var smtpPass = process.env.SMTP_PASS || "dgut tplg plco zlno";
smtpPass = String(smtpPass || "").replace(/\s+/g, "");

var transporterConfig = smtpHost
    ? { host: smtpHost, port: smtpPort, secure: smtpSecure }
    : { service: "gmail" };

var transporter = nodemailer.createTransport(
    Object.assign({}, transporterConfig, {
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    })
);
var fromEmail = process.env.FROM_EMAIL || smtpUser;

function sendVerificationEmail(email, verificationCode) {
   const mailOptions = {
      from: fromEmail || (transporter.options.auth && transporter.options.auth.user),
      to: email,
      subject: 'Rudraksh Creation - Admin Reset Code',
      html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #f2dede;">
            <div style="background: linear-gradient(135deg, #b31217, #f39b1d); color: white; padding: 20px; text-align: center;">
               <img src="https://i.ibb.co/1fM9j4b/Rfavicon.png" alt="Rudraksh Creation" style="height: 42px; margin-bottom: 10px;">
               <h1 style="margin: 0; font-size: 22px;">Rudraksh Creation</h1>
               <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Admin Portal Verification</p>
            </div>
            <div style="padding: 22px; background: #fff8f6;">
               <h2 style="color: #b31217; margin-top: 0;">Email Verification</h2>
               <p>Welcome back to Rudraksh Creation admin portal.</p>
               <p>Your verification code is:</p>
               <div style="background: #b31217; color: white; padding: 14px; text-align: center; font-size: 26px; font-weight: bold; margin: 18px 0; border-radius: 10px; letter-spacing: 3px;">
                  ${verificationCode}
               </div>
               <p>Please enter this code to verify your email address.</p>
               <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div style="background: #1b0f0c; color: #f6efe9; padding: 12px; text-align: center; font-size: 12px;">
               &copy; 2026 Rudraksh Creation. All rights reserved.
            </div>
         </div>
      `
   };

   return transporter.sendMail(mailOptions);
}

router.get("/", function (req, res) {
    var filePath = path.join(__dirname, "..", "Public", "admin", "index.html");
    res.sendFile(filePath);
});

router.get("/login", function (req, res) {
    var filePath = path.join(__dirname, "..", "Public", "admin", "login.html");
    res.sendFile(filePath);
});

router.get("/news-items-public", async function (req, res) {
    try {
        var state = await newsItems.getNewsState();
        return res.json({
            ok: true,
            items: state.items,
            paused: state.paused,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load news items." });
    }
});

router.get("/news-items", adminAuth, async function (req, res) {
    try {
        var state = await newsItems.getNewsState();
        return res.json({
            ok: true,
            items: state.items,
            paused: state.paused,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load news items." });
    }
});

router.post("/news-items", adminAuth, async function (req, res) {
    try {
        var item = await newsItems.createNewsItem({
            title: getRequestValue(req, "title"),
            content: getRequestValue(req, "content"),
            contentLink: getRequestValue(req, "contentLink"),
            imageUrl: getRequestValue(req, "imageUrl"),
        });
        var list = await newsItems.listNewsItems();
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News item added successfully.",
            item: item,
            items: list,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to add news item." });
    }
});

router.post("/news-media", adminAuth, function (req, res) {
    newsMediaUpload.single("file")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var file = req.file;
        if (!file) {
            return res.status(400).json({ ok: false, message: "No file uploaded." });
        }

        try {
            await ensureNewsMediaDir();

            var mimeType = String(file.mimetype || "").toLowerCase();
            var ext = NEWS_MEDIA_MIME_TO_EXT[mimeType];
            if (!ext) {
                return res.status(400).json({ ok: false, message: "Only JPG/PNG/PDF files are allowed." });
            }

            var originalExt = path.extname(String(file.originalname || "")).toLowerCase();
            var originalBase = path.basename(String(file.originalname || ""), originalExt);
            var baseName = sanitizeImageBaseName(originalBase || "news-file");
            var uniquePart = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
            var fileName = baseName + "-" + uniquePart + ext;
            var savePath = path.join(NEWS_MEDIA_DIR, fileName);
            await fs.promises.writeFile(savePath, file.buffer);

            return res.json({
                ok: true,
                message: "File uploaded successfully.",
                file: {
                    name: fileName,
                    path: "/news-files/" + fileName,
                    mimeType: mimeType,
                    size: Number(file.size) || 0,
                },
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to upload file." });
        }
    });
});

router.put("/news-scroll-state", adminAuth, async function (req, res) {
    try {
        var rawPaused = getRequestValue(req, "paused");
        var nextPaused = rawPaused === true || rawPaused === "true" || rawPaused === 1 || rawPaused === "1";
        var paused = await newsItems.setNewsPaused(nextPaused);
        return res.json({
            ok: true,
            message: paused ? "News scroll paused." : "News scroll resumed.",
            paused: paused,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to update news scroll state." });
    }
});

router.put("/news-items/:id", adminAuth, async function (req, res) {
    try {
        var updated = await newsItems.updateNewsItem(req.params.id, {
            title: getRequestValue(req, "title"),
            content: getRequestValue(req, "content"),
            contentLink: getRequestValue(req, "contentLink"),
            imageUrl: getRequestValue(req, "imageUrl"),
        });

        if (!updated) {
            return res.status(404).json({ ok: false, message: "News item not found." });
        }

        var list = await newsItems.listNewsItems();
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News item updated successfully.",
            item: updated,
            items: list,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to update news item." });
    }
});

router.delete("/news-items/:id", adminAuth, async function (req, res) {
    try {
        var removed = await newsItems.deleteNewsItem(req.params.id);
        if (!removed) {
            return res.status(404).json({ ok: false, message: "News item not found." });
        }
        var list = await newsItems.listNewsItems();
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News item deleted successfully.",
            items: list,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete news item." });
    }
});

router.post("/news-items/reorder", adminAuth, async function (req, res) {
    try {
        var newsId = String(getRequestValue(req, "id") || "").trim();
        var sequence = Number(getRequestValue(req, "sequence"));
        if (!newsId) {
            return res.status(400).json({ ok: false, message: "Invalid news id." });
        }
        if (!Number.isInteger(sequence) || sequence < 1) {
            return res.status(400).json({ ok: false, message: "Invalid sequence." });
        }
        var items = await newsItems.reorderNewsSequence(newsId, sequence);
        if (!items) {
            return res.status(404).json({ ok: false, message: "News item not found." });
        }
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News sequence updated successfully.",
            items: items,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to update news sequence." });
    }
});

router.get("/carousel", adminAuth, async function (req, res) {
    try {
        var banners = await carouselBanners.listCarouselBanners();
        return res.json({ ok: true, banners: banners });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load carousel banners." });
    }
});

router.get("/gallery-folders", adminAuth, async function (req, res) {
    try {
        var folders = await listGalleryFoldersOrdered();
        return res.json({ ok: true, folders: folders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery folders." });
    }
});

router.get("/gallery-folder-cards", adminAuth, async function (req, res) {
    try {
        var cards = await buildGalleryFolderCards(false);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery folders." });
    }
});

router.post("/gallery-folders", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var existing = await listGalleryFolders();
        var folderKeyValue = folderKey(folderName);
        if (existing.some(function (name) {
            return folderKey(name) === folderKeyValue;
        })) {
            return res.status(409).json({ ok: false, message: "Folder already exists." });
        }
        await ensureGalleryFolderDir(folderName);
        var order = await readGalleryFolderOrder();
        var key = folderKey(folderName);
        order = order.filter(function (name) {
            return folderKey(name) !== key;
        });
        order.unshift(folderName);
        await writeGalleryFolderOrder(order);
        var folders = await listGalleryFoldersOrdered();
        return res.json({
            ok: true,
            message: "Folder created successfully.",
            folderName: folderName,
            folders: folders,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to create folder." });
    }
});

router.post("/gallery-folders/reorder", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    if (!Number.isInteger(sequence) || sequence < 1) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        var folders = await reorderGalleryFolderSequence(folderName, sequence);
        var cards = await buildGalleryFolderCards(false);
        return res.json({
            ok: true,
            message: "Folder sequence updated successfully.",
            folderName: folderName,
            folders: folders,
            cards: cards,
        });
    } catch (error) {
        if (error && (error.message === "Invalid folder name." || error.message === "Invalid sequence.")) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error && error.message === "Folder not found.") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder gallery folders." });
    }
});

router.delete("/gallery-folders/:folderName", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(req.params.folderName);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        await fs.promises.rm(folderDir, { recursive: true, force: false });
        var cards = await buildGalleryFolderCards(false);
        return res.json({
            ok: true,
            message: "Folder deleted successfully.",
            folder: folderName,
            folders: cards,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete folder." });
    }
});

router.get("/gallery-folders-public", async function (req, res) {
    try {
        var cards = await buildGalleryFolderCards(true);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery folders." });
    }
});

router.get("/gallery-images-public", async function (req, res) {
    try {
        var cards = await buildGalleryFolderCards(true);
        if (!cards.length) {
            return res.json({ ok: true, folder: "", images: [] });
        }

        var requestedFolder = "";
        if (req && req.query && typeof req.query === "object" && req.query.folder != null) {
            requestedFolder = normalizeFolderName(req.query.folder);
        }

        var allowedNames = cards.map(function (item) {
            return item.name;
        });

        var activeFolder = requestedFolder && allowedNames.includes(requestedFolder)
            ? requestedFolder
            : allowedNames[0];

        var images = await listGalleryImages(activeFolder);
        return res.json({ ok: true, folder: activeFolder, images: images });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery images." });
    }
});

router.get("/gallery-images", adminAuth, async function (req, res) {
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var images = await listGalleryImages(folderName);
        return res.json({ ok: true, folder: folderName, images: images });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery images." });
    }
});

router.post("/gallery-images", adminAuth, function (req, res) {
    upload.array("images")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ ok: false, message: "No images uploaded." });
        }

        var folderName = getFolderNameFromReq(req);
        if (!folderName) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        try {
            var folders = await listGalleryFolders();
            if (!folders.includes(folderName)) {
                return res.status(404).json({ ok: false, message: "Folder not found." });
            }

            var folderDir = getGalleryFolderDir(folderName);
            if (!folderDir) {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            var uploaded = [];

            for (var i = 0; i < files.length; i += 1) {
                var file = files[i];
                var ext = MIME_TO_EXT[String(file.mimetype || "").toLowerCase()];
                if (!ext) {
                    return res.status(400).json({ ok: false, message: "Only JPG/PNG images are allowed." });
                }

                var originalExt = path.extname(String(file.originalname || "")).toLowerCase();
                var originalBase = path.basename(String(file.originalname || ""), originalExt);
                var baseName = sanitizeImageBaseName(originalBase);
                var uniquePart = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
                var fileName = baseName + "-" + uniquePart + ext;
                var savePath = path.join(folderDir, fileName);
                await fs.promises.writeFile(savePath, file.buffer);

                uploaded.push({
                    name: fileName,
                    folder: folderName,
                    path: "/images/gallery/" + folderName + "/" + fileName,
                    size: file.size,
                });
            }

            var images = await listGalleryImages(folderName);
            return res.json({
                ok: true,
                message: "Images uploaded successfully.",
                folder: folderName,
                uploaded: uploaded,
                images: images,
            });
        } catch (error) {
            if (error && error.message === "Invalid folder name.") {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to upload images." });
        }
    });
});

router.delete("/gallery-images/:fileName", adminAuth, async function (req, res) {
    var fileName = String(req.params.fileName || "").trim();
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    var lowerExt = path.extname(fileName).toLowerCase();
    if (
        !fileName ||
        fileName === "." ||
        fileName === ".." ||
        !GALLERY_FILE_REGEX.test(fileName) ||
        fileName !== path.basename(fileName) ||
        !GALLERY_ALLOWED_EXTS.includes(lowerExt)
    ) {
        return res.status(400).json({ ok: false, message: "Invalid file name." });
    }

    try {
        var folders = await listGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        var rootDir = path.resolve(folderDir);
        var targetPath = path.resolve(folderDir, fileName);

        if (!targetPath.startsWith(rootDir + path.sep) && targetPath !== rootDir) {
            return res.status(400).json({ ok: false, message: "Invalid file name." });
        }

        await fs.promises.unlink(targetPath);
        var images = await listGalleryImages(folderName);
        return res.json({ ok: true, message: "Image removed successfully.", folder: folderName, images: images });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Image not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to remove image." });
    }
});

router.get("/video-folders", adminAuth, async function (req, res) {
    try {
        var folders = await listVideoGalleryFoldersOrdered();
        return res.json({ ok: true, folders: folders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load video folders." });
    }
});

router.get("/video-folder-cards", adminAuth, async function (req, res) {
    try {
        var cards = await buildVideoFolderCards(false);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load video folders." });
    }
});

router.post("/video-folders", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var existing = await listVideoGalleryFolders();
        var folderKeyValue = folderKey(folderName);
        if (existing.some(function (name) {
            return folderKey(name) === folderKeyValue;
        })) {
            return res.status(409).json({ ok: false, message: "Folder already exists." });
        }
        await ensureVideoGalleryFolderDir(folderName);
        var order = await readVideoFolderOrder();
        var key = folderKey(folderName);
        order = order.filter(function (name) {
            return folderKey(name) !== key;
        });
        order.unshift(folderName);
        await writeVideoFolderOrder(order);
        var folders = await listVideoGalleryFoldersOrdered();
        return res.json({
            ok: true,
            message: "Video folder created successfully.",
            folderName: folderName,
            folders: folders,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to create video folder." });
    }
});

router.post("/video-folders/reorder", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    if (!Number.isInteger(sequence) || sequence < 1) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        var folders = await reorderVideoFolderSequence(folderName, sequence);
        var cards = await buildVideoFolderCards(false);
        return res.json({
            ok: true,
            message: "Video folder sequence updated successfully.",
            folderName: folderName,
            folders: folders,
            cards: cards,
        });
    } catch (error) {
        if (error && (error.message === "Invalid folder name." || error.message === "Invalid sequence.")) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error && error.message === "Folder not found.") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder video folders." });
    }
});

router.delete("/video-folders/:folderName", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(req.params.folderName);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listVideoGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getVideoGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        await fs.promises.rm(folderDir, { recursive: true, force: false });
        var cards = await buildVideoFolderCards(false);
        return res.json({
            ok: true,
            message: "Video folder deleted successfully.",
            folder: folderName,
            folders: cards,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete video folder." });
    }
});

router.get("/video-folders-public", async function (req, res) {
    try {
        var cards = await buildVideoFolderCards(true);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load video folders." });
    }
});

router.get("/video-files-public", async function (req, res) {
    try {
        var cards = await buildVideoFolderCards(true);
        if (!cards.length) {
            return res.json({ ok: true, folder: "", videos: [] });
        }

        var requestedFolder = "";
        if (req && req.query && typeof req.query === "object" && req.query.folder != null) {
            requestedFolder = normalizeFolderName(req.query.folder);
        }

        var allowedNames = cards.map(function (item) {
            return item.name;
        });

        var activeFolder = requestedFolder && allowedNames.includes(requestedFolder)
            ? requestedFolder
            : allowedNames[0];

        var videos = await listVideoGalleryFiles(activeFolder);
        return res.json({ ok: true, folder: activeFolder, videos: videos });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery videos." });
    }
});

router.get("/video-files", adminAuth, async function (req, res) {
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listVideoGalleryFolders();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var videos = await listVideoGalleryFiles(folderName);
        return res.json({ ok: true, folder: folderName, videos: videos });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load folder videos." });
    }
});

router.post("/video-files", adminAuth, function (req, res) {
    videoUpload.array("videos")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ ok: false, message: "No videos uploaded." });
        }

        var folderName = getFolderNameFromReq(req);
        if (!folderName) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        try {
            var folders = await listVideoGalleryFolders();
            if (!folders.includes(folderName)) {
                return res.status(404).json({ ok: false, message: "Folder not found." });
            }

            var folderDir = getVideoGalleryFolderDir(folderName);
            if (!folderDir) {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            var uploaded = [];

            for (var i = 0; i < files.length; i += 1) {
                var file = files[i];
                var ext = VIDEO_MIME_TO_EXT[String(file.mimetype || "").toLowerCase()];
                if (!ext) {
                    return res.status(400).json({ ok: false, message: "Only MP4/WEBM/OGG/MOV videos are allowed." });
                }

                var originalExt = path.extname(String(file.originalname || "")).toLowerCase();
                var originalBase = path.basename(String(file.originalname || ""), originalExt);
                var baseName = sanitizeImageBaseName(originalBase);
                var uniquePart = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
                var fileName = baseName + "-" + uniquePart + ext;
                var savePath = path.join(folderDir, fileName);
                await fs.promises.writeFile(savePath, file.buffer);

                uploaded.push({
                    name: fileName,
                    folder: folderName,
                    path: "/videos/gallery/" + folderName + "/" + fileName,
                    size: file.size,
                });
            }

            var videos = await listVideoGalleryFiles(folderName);
            return res.json({
                ok: true,
                message: "Videos uploaded successfully.",
                folder: folderName,
                uploaded: uploaded,
                videos: videos,
            });
        } catch (error) {
            if (error && error.message === "Invalid folder name.") {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to upload videos." });
        }
    });
});

router.delete("/video-files/:fileName", adminAuth, async function (req, res) {
    var fileName = String(req.params.fileName || "").trim();
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    var lowerExt = path.extname(fileName).toLowerCase();
    if (
        !fileName ||
        fileName === "." ||
        fileName === ".." ||
        !GALLERY_FILE_REGEX.test(fileName) ||
        fileName !== path.basename(fileName) ||
        !VIDEO_ALLOWED_EXTS.includes(lowerExt)
    ) {
        return res.status(400).json({ ok: false, message: "Invalid file name." });
    }

    try {
        var folders = await listVideoGalleryFolders();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getVideoGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        var rootDir = path.resolve(folderDir);
        var targetPath = path.resolve(folderDir, fileName);

        if (!targetPath.startsWith(rootDir + path.sep) && targetPath !== rootDir) {
            return res.status(400).json({ ok: false, message: "Invalid file name." });
        }

        await fs.promises.unlink(targetPath);
        var videos = await listVideoGalleryFiles(folderName);
        return res.json({ ok: true, message: "Video removed successfully.", folder: folderName, videos: videos });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Video not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to remove video." });
    }
});

router.get("/enquiries", adminAuth, async function (req, res) {
    var limit = Number(req.query.limit || 200);
    try {
        var list = await enquiries.listEnquiries(limit);
        return res.json({ ok: true, enquiries: list });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load enquiries." });
    }
});

router.delete("/enquiries/:id", adminAuth, async function (req, res) {
    var enquiryId = String(req.params.id || "").trim();
    if (!enquiryId) {
        return res.status(400).json({ ok: false, message: "Invalid enquiry id." });
    }

    try {
        var removed = await enquiries.deleteEnquiry(enquiryId);
        if (!removed) {
            return res.status(404).json({ ok: false, message: "Enquiry not found." });
        }
        return res.json({ ok: true, message: "Enquiry deleted successfully." });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete enquiry." });
    }
});

router.post("/carousel/reorder", adminAuth, async function (req, res) {
    var bannerName = carouselBanners.normalizeBannerName(getRequestValue(req, "bannerName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!carouselBanners.isValidBannerName(bannerName)) {
        return res.status(400).json({ ok: false, message: "Invalid banner name." });
    }

    if (!Number.isInteger(sequence)) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        var banners = await carouselBanners.reorderBannerSequence(bannerName, sequence);
        return res.json({
            ok: true,
            message: "Carousel sequence updated successfully.",
            banners: banners,
        });
    } catch (error) {
        if (error.message === "Invalid banner name." || error.message === "Invalid sequence.") {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error.message === "Banner not found.") {
            return res.status(404).json({ ok: false, message: error.message });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder carousel banners." });
    }
});

router.post("/login", async function (req, res) {
    var username = normalizeEmail(getRequestValue(req, "username") || getRequestValue(req, "email"));
    var password = String(getRequestValue(req, "password") || getRequestValue(req, "pwd"));

    if (!isValidEmail(username)) {
        return res.status(400).json({ ok: false, message: "Enter a valid email address." });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }

    try {
        var result = await db.query("select email from users where lower(email)=? and pass=? limit 1", [username, password]);
        var rows = result[0] || [];
        if (rows.length === 0) {
            return res.status(401).json({ ok: false, message: "Invalid credentials." });
        }

        var token = jwt.sign(
            { username: rows[0].email || username, role: "admin" },
            JWT_SECRET,
            { expiresIn: "30m" }
        );

        return res.json({ ok: true, token: token, expiresIn: ADMIN_TOKEN_EXPIRES_SECONDS });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Login failed. Please try again." });
    }
});

router.post("/forgot-password", async function (req, res) {
    var email = normalizeEmail(getRequestValue(req, "email"));

    if (!isValidEmail(email)) {
        return res.status(400).json({ ok: false, message: "Enter a valid email address." });
    }

    try {
        var result = await db.query("select email from users where lower(email)=? limit 1", [email]);
        var rows = result[0] || [];
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, message: "Admin email not found." });
        }

        var matchedEmail = String(rows[0].email || email);
        var resetKey = normalizeEmail(matchedEmail);
        var token = Math.floor(100000 + Math.random() * 900000).toString();
        var expiresAt = Date.now() + 5 * 60 * 1000;
        resetStore.set(resetKey, { token: token, expiresAt: expiresAt, email: matchedEmail });

        sendVerificationEmail(matchedEmail, token)
            .then(function () {
                return res.json({
                    ok: true,
                    message: "Reset code sent to your email. Use it within 5 minutes.",
                });
            })
            .catch(function (error) {
                console.error("Error sending password reset email:", error);
                resetStore.delete(resetKey);
                var errorMessage = "Unable to send reset email. Please try again.";
                if (error && error.code === 'EAUTH') {
                    errorMessage = "Email server authentication failed. Check SMTP credentials.";
                } else if (error && error.code === 'ECONNECTION') {
                    errorMessage = "Could not connect to email server. Check SMTP host/port.";
                }
                return res.status(500).json({
                    ok: false,
                    message: errorMessage,
                });
            });
    } catch (error) {
        console.error("Error in forgot-password route:", error);
        return res.status(500).json({ ok: false, message: "Unable to send reset email." });
    }
});

router.post("/reset-password", async function (req, res) {
    var email = normalizeEmail(getRequestValue(req, "email"));
    var token = String(getRequestValue(req, "token")).trim();
    var newPassword = String(getRequestValue(req, "newPassword"));

    if (!isValidEmail(email)) {
        return res.status(400).json({ ok: false, message: "Enter a valid email address." });
    }

    if (!token || token.length !== 6) {
        return res.status(400).json({ ok: false, message: "Enter the 6-digit reset code." });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }

    try {
        var resetKey = email;
        var saved = resetStore.get(resetKey);
        if (!saved || saved.token !== token) {
            return res.status(400).json({ ok: false, message: "Invalid reset code." });
        }

        if (Date.now() > saved.expiresAt) {
            resetStore.delete(resetKey);
            return res.status(400).json({ ok: false, message: "Reset code expired." });
        }

        var targetEmail = normalizeEmail(saved.email || email);
        var updateResult = await db.query("update users set pass=? where lower(email)=?", [newPassword, targetEmail]);
        var updateMeta = updateResult[0] || {};
        if (!updateMeta.affectedRows) {
            return res.status(404).json({ ok: false, message: "Admin email not found." });
        }

        resetStore.delete(resetKey);

        return res.json({ ok: true, message: "Password updated. Please login." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reset password." });
    }
});

router.post("/carousel", adminAuth, function (req, res) {
    upload.fields([
        { name: "banner", maxCount: 1 },
        { name: "banners", maxCount: 5 },
    ])(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var uploadedFiles = [];
        if (req && req.files && typeof req.files === "object") {
            var singleFiles = Array.isArray(req.files.banner) ? req.files.banner : [];
            var multiFiles = Array.isArray(req.files.banners) ? req.files.banners : [];
            uploadedFiles = singleFiles.concat(multiFiles);
        }

        if (uploadedFiles.length > 5) {
            return res.status(400).json({ ok: false, message: "Please upload up to 5 slider images at one time." });
        }

        if (!uploadedFiles.length) {
            return res.status(400).json({ ok: false, message: "No file uploaded." });
        }

        try {
            var saved = [];
            for (var i = 0; i < uploadedFiles.length; i += 1) {
                var nextBannerName = await carouselBanners.getNextBannerName();
                var item = await carouselBanners.saveBannerFile(nextBannerName, uploadedFiles[i]);
                saved.push(item);
            }
            var banners = await carouselBanners.listCarouselBanners();

            return res.json({
                ok: true,
                message:
                    saved.length === 1
                        ? "Carousel banner added successfully."
                        : "Carousel banners added successfully.",
                banner: saved[0] || null,
                added: saved,
                banners: banners,
            });
        } catch (error) {
            if (isUploadValidationError(error.message)) {
                return res.status(400).json({ ok: false, message: error.message });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to add carousel banner." });
        }
    });
});

router.delete("/carousel/:bannerName", adminAuth, async function (req, res) {
    try {
        var removed = await carouselBanners.removeBannerFile(req.params.bannerName);
        if (!removed) {
            return res.status(404).json({ ok: false, message: "Banner not found." });
        }

        var banners = await carouselBanners.listCarouselBanners();
        return res.json({
            ok: true,
            message: "Carousel banner removed successfully.",
            banners: banners,
        });
    } catch (error) {
        if (error.message === "Invalid banner name.") {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to remove carousel banner." });
    }
});

router.post("/update-banner/:bannerName", adminAuth, function (req, res) {
    upload.single("banner")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ ok: false, message: "No file uploaded." });
        }

        try {
            var saved = await carouselBanners.saveBannerFile(req.params.bannerName, req.file);

            return res.json({
                ok: true,
                message: "Banner updated successfully.",
                path: saved.path,
                name: saved.name,
            });
        } catch (error) {
            if (isUploadValidationError(error.message)) {
                return res.status(400).json({ ok: false, message: error.message });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to update banner." });
        }
    });
});

router.get("/portfolio-folders", adminAuth, async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    if (!category) return res.status(400).json({ ok: false, message: "Invalid category." });
    try {
        var folders = await listPortfolioFoldersOrdered(category);
        var cards = await Promise.all(folders.map(async function(folder) {
            var files = await listPortfolioFilesOrdered(category, folder);
            var coverFile = await resolvePortfolioCoverFile(category, folder, files);
            return {
                name: folder,
                fileCount: files.length,
                coverPath: coverFile ? coverFile.path : "",
                coverType: coverFile ? (coverFile.name.toLowerCase().endsWith(".mp4") ? "video" : "image") : ""
            };
        }));
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to load portfolio folders." });
    }
});

router.get("/portfolio-folders-public", async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    if (!category) return res.status(400).json({ ok: false, message: "Invalid category." });
    try {
        var folders = await listPortfolioFoldersOrdered(category);
        var cards = await Promise.all(folders.map(async function(folder) {
            var files = await listPortfolioFilesOrdered(category, folder);
            var coverFile = await resolvePortfolioCoverFile(category, folder, files);
            return {
                name: folder,
                fileCount: files.length,
                coverPath: coverFile ? coverFile.path : "",
                coverType: coverFile ? (coverFile.name.toLowerCase().endsWith(".mp4") ? "video" : "image") : ""
            };
        }));
        // Filter out empty folders for public view
        cards = cards.filter(function (card) { return card.fileCount > 0; });
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to load portfolio folders." });
    }
});

router.get("/portfolio-files-public", async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    var folderName = normalizeFolderName((req.query && req.query.folder) || getRequestValue(req, "folder"));
    if (!category || !folderName) return res.status(400).json({ ok: false, message: "Invalid folder name." });
    
    try {
        var files = await listPortfolioFilesOrdered(category, folderName);
        return res.json({ ok: true, folder: folderName, files: files });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to load portfolio files." });
    }
});

router.post("/portfolio-folders", adminAuth, async function (req, res) {
    var category = normalizeFolderName(getRequestValue(req, "category"));
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    if (!category || !folderName) return res.status(400).json({ ok: false, message: "Invalid folder name." });

    try {
        var categoryDir = getPortfolioCategoryDir(category);
        if (!categoryDir) {
            return res.status(400).json({ ok: false, message: "Invalid category." });
        }
        await fs.promises.mkdir(categoryDir, { recursive: true });

        var existing = await listPortfolioFolders(category);
        var key = folderKey(folderName);
        if (existing.some(function(n) { return folderKey(n) === key; })) {
            return res.status(409).json({ ok: false, message: "Folder already exists." });
        }

        var folderDir = getPortfolioFolderDir(category, folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        await fs.promises.mkdir(folderDir, { recursive: true });

        var order = await readPortfolioFolderOrder(category);
        order.unshift(folderName);
        await writePortfolioFolderOrder(category, order);

        var folders = await listPortfolioFoldersOrdered(category);
        var cards = await Promise.all(folders.map(async function(folder) {
            var files = await listPortfolioFilesOrdered(category, folder);
            var coverFile = await resolvePortfolioCoverFile(category, folder, files);
            return {
                name: folder,
                fileCount: files.length,
                coverPath: coverFile ? coverFile.path : "",
                coverType: coverFile ? (coverFile.name.toLowerCase().endsWith(".mp4") ? "video" : "image") : ""
            };
        }));
        return res.json({ ok: true, message: "Portfolio folder created successfully.", folderName: folderName, folders: cards });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to create portfolio folder." });
    }
});

router.post("/portfolio-folders/reorder", adminAuth, async function (req, res) {
    var category = normalizeFolderName(getRequestValue(req, "category"));
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!category) {
        return res.status(400).json({ ok: false, message: "Invalid category." });
    }
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }
    if (!Number.isInteger(sequence) || sequence < 1) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        await reorderPortfolioFolderSequence(category, folderName, sequence);

        var folders = await listPortfolioFoldersOrdered(category);
        var cards = await Promise.all(folders.map(async function(folder) {
            var files = await listPortfolioFilesOrdered(category, folder);
            var coverFile = await resolvePortfolioCoverFile(category, folder, files);
            return {
                name: folder,
                fileCount: files.length,
                coverPath: coverFile ? coverFile.path : "",
                coverType: coverFile ? (coverFile.name.toLowerCase().endsWith(".mp4") ? "video" : "image") : ""
            };
        }));

        return res.json({
            ok: true,
            message: "Portfolio folder sequence updated successfully.",
            folderName: folderName,
            folders: cards,
        });
    } catch (error) {
        if (error && (error.message === "Invalid folder name." || error.message === "Invalid sequence.")) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error && error.message === "Folder not found.") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder portfolio folders." });
    }
});

router.post("/portfolio-folders/cover", adminAuth, async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    var folderName = normalizeFolderName((req.query && req.query.folder) || getRequestValue(req, "folder"));
    var fileName = String(getRequestValue(req, "fileName") || "").trim();

    if (!category || !folderName || !fileName || !GALLERY_FILE_REGEX.test(fileName)) {
        return res.status(400).json({ ok: false, message: "Invalid category, folder, or file name." });
    }

    try {
        var files = await listPortfolioFilesOrdered(category, folderName);
        var exists = files.some(function (f) { return String(f && f.name || "") === fileName; });
        if (!exists) {
            return res.status(404).json({ ok: false, message: "File not found in this folder." });
        }

        await setPortfolioCoverFileName(category, folderName, fileName);
        return res.json({ ok: true, message: "Folder cover updated successfully.", coverFileName: fileName });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to update folder cover." });
    }
});

router.delete("/portfolio-folders/:folderName", adminAuth, async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    var folderName = normalizeFolderName(req.params.folderName);
    if (!category || !folderName) return res.status(400).json({ ok: false, message: "Invalid folder name." });

    try {
        await clearPortfolioCoverFileName(category, folderName);

        var folderDir = getPortfolioFolderDir(category, folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        var categoryDir = getPortfolioCategoryDir(category);
        if (!categoryDir) {
            return res.status(400).json({ ok: false, message: "Invalid category." });
        }

        var resolvedFolderDir = path.resolve(folderDir);
        var resolvedCategoryDir = path.resolve(categoryDir);
        if (!resolvedFolderDir.startsWith(resolvedCategoryDir + path.sep)) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        await fs.promises.rm(resolvedFolderDir, { recursive: true, force: true });

        // Best-effort cleanup for legacy Cloudinary+Mongo records.
        var filesToDelete = await PortfolioItem.find({ category: category, folder: folderName }).lean().catch(function () {
            return [];
        });
        for (var i = 0; i < filesToDelete.length; i += 1) {
            var item = filesToDelete[i];
            if (item && item.public_id) {
                var resourceType = String(item.name || "").toLowerCase().endsWith(".mp4") ? "video" : "image";
                await cloudinary.uploader.destroy(item.public_id, { resource_type: resourceType }).catch(function () {});
            }
        }
        await PortfolioItem.deleteMany({ category: category, folder: folderName }).catch(function () {});
        
        var order = await readPortfolioFolderOrder(category);
        order = order.filter(function(name) { return folderKey(name) !== folderKey(folderName); });
        await writePortfolioFolderOrder(category, order);
        
        var folders = await listPortfolioFoldersOrdered(category);
        var cards = await Promise.all(folders.map(async function(folder) {
            var files = await listPortfolioFilesOrdered(category, folder);
            var coverFile = await resolvePortfolioCoverFile(category, folder, files);
            return {
                name: folder,
                fileCount: files.length,
                coverPath: coverFile ? coverFile.path : "",
                coverType: coverFile ? (coverFile.name.toLowerCase().endsWith(".mp4") ? "video" : "image") : ""
            };
        }));
        return res.json({ ok: true, message: "Portfolio folder deleted successfully.", folders: cards });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to delete portfolio folder." });
    }
});

router.get("/portfolio-files", adminAuth, async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    var folderName = normalizeFolderName((req.query && req.query.folder) || getRequestValue(req, "folder"));
    if (!category || !folderName) return res.status(400).json({ ok: false, message: "Invalid folder name." });
    
    try {
        var files = await listPortfolioFilesOrdered(category, folderName);
        var coverFile = await resolvePortfolioCoverFile(category, folderName, files);
        return res.json({ ok: true, folder: folderName, files: files, coverFileName: coverFile ? coverFile.name : "" });
    } catch (error) {
        return res.status(500).json({ ok: false, message: "Unable to load portfolio files." });
    }
});

router.post("/portfolio-files", adminAuth, fileUploader(), async function (req, res) {
    if (!req.files || !req.files.files) return res.status(400).json({ ok: false, message: "No files uploaded." });
    
    var files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    var category = normalizeFolderName(getRequestValue(req, "category"));
    var folderName = normalizeFolderName(getRequestValue(req, "folder"));
    if (!category || !folderName) return res.status(400).json({ ok: false, message: "Invalid folder name." });

    try {
        var folderDir = getPortfolioFolderDir(category, folderName);
        if (!folderDir) return res.status(400).json({ ok: false, message: "Invalid folder name." });
        await fs.promises.mkdir(folderDir, { recursive: true });

        var results = [];
        for (var i = 0; i < files.length; i += 1) {
            var file = files[i];
            var mimeType = String(file.mimetype || "").toLowerCase();
            var ext = PORTFOLIO_MIME_TO_EXT[mimeType];
            if (!ext) {
                var fallbackExt = path.extname(String(file.name || "")).toLowerCase();
                if (PORTFOLIO_ALLOWED_EXTS.has(fallbackExt)) {
                    ext = fallbackExt;
                } else {
                    throw new Error("Unsupported file type: " + mimeType);
                }
            }
            if (!PORTFOLIO_ALLOWED_EXTS.has(ext)) {
                throw new Error("Unsupported file extension: " + ext);
            }

            var isVideo = mimeType.startsWith("video/") || ext === ".mp4" || ext === ".mov" || ext === ".webm" || ext === ".m4v" || ext === ".ogg";
            if (!isVideo && file.size > PORTFOLIO_IMAGE_MAX_SIZE) {
                throw new Error("Image files cannot exceed 10MB.");
            }
            if (file.size > PORTFOLIO_MAX_SIZE) {
                throw new Error("File size exceeds allowed limit.");
            }

            var originalExt = path.extname(String(file.name || "")).toLowerCase();
            var baseName = sanitizeImageBaseName(path.basename(String(file.name || ""), originalExt));
            var uniquePart = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
            var fileName = baseName + "-" + uniquePart + ext;
            var savePath = path.join(folderDir, fileName);
            await fs.promises.writeFile(savePath, file.data);

            results.push({
                id: category + ":" + folderName + ":" + fileName,
                category: category,
                folder: folderName,
                name: fileName,
                path: "/portfolio/" + category + "/" + folderName + "/" + fileName,
                public_id: "",
                size: file.size,
                createdAt: new Date().toISOString(),
            });
        }
        
        var uploadedNames = results.map(function(r) { return r.name; });
        var order = await readPortfolioFileOrder(category, folderName);
        var newOrder = uploadedNames.concat(order);
        await writePortfolioFileOrder(category, folderName, newOrder);

        var fileList = await listPortfolioFilesOrdered(category, folderName);
        var coverFile = await resolvePortfolioCoverFile(category, folderName, fileList);
        return res.json({ ok: true, message: "Files uploaded successfully.", files: fileList, coverFileName: coverFile ? coverFile.name : "" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: error.message || "Unable to upload files." });
    }
});

router.delete("/portfolio-files/:fileName", adminAuth, async function (req, res) {
    var category = normalizeFolderName((req.query && req.query.category) || getRequestValue(req, "category"));
    var folderName = normalizeFolderName((req.query && req.query.folder) || getRequestValue(req, "folder"));
    var fileName = String(req.params.fileName || "").trim();
    
    if (!category || !folderName || !fileName || !GALLERY_FILE_REGEX.test(fileName)) {
        return res.status(400).json({ ok: false, message: "Invalid file name." });
    }
    
    try {
        var folderDir = getPortfolioFolderDir(category, folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        var absoluteFolderDir = path.resolve(folderDir);
        var targetPath = path.resolve(folderDir, fileName);
        if (!targetPath.startsWith(absoluteFolderDir + path.sep)) {
            return res.status(400).json({ ok: false, message: "Invalid file name." });
        }

        await fs.promises.unlink(targetPath);

        // Best-effort cleanup for legacy Cloudinary+Mongo records.
        var item = await PortfolioItem.findOne({ category: category, folder: folderName, name: fileName }).catch(function () {
            return null;
        });
        if (item) {
            if (item.public_id) {
                var resourceType = String(item.name || "").toLowerCase().endsWith(".mp4") ? "video" : "image";
                await cloudinary.uploader.destroy(item.public_id, { resource_type: resourceType }).catch(function () {});
            }
            await PortfolioItem.deleteOne({ _id: item._id }).catch(function () {});
        }

        var order = await readPortfolioFileOrder(category, folderName);
        var newOrder = order.filter(function(name) { return name !== fileName; });
        if (newOrder.length < order.length) {
            await writePortfolioFileOrder(category, folderName, newOrder);
        }

        var fileList = await listPortfolioFilesOrdered(category, folderName);
        var coverName = await getPortfolioCoverFileName(category, folderName);
        if (coverName && coverName === fileName) {
            await clearPortfolioCoverFileName(category, folderName);
        }
        var coverFile = await resolvePortfolioCoverFile(category, folderName, fileList);
        return res.json({ ok: true, message: "File removed successfully.", files: fileList, coverFileName: coverFile ? coverFile.name : "" });
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return res.status(404).json({ ok: false, message: "File not found." });
        }
        return res.status(500).json({ ok: false, message: "Unable to remove file." });
    }
});

router.post("/portfolio-files/rename", adminAuth, async function (req, res) {
    var category = normalizeFolderName(getRequestValue(req, "category"));
    var folderName = normalizeFolderName(getRequestValue(req, "folder"));
    var oldName = getRequestValue(req, "oldName");
    var newNameBase = getRequestValue(req, "newName");
    if (!category || !folderName || !oldName || !newNameBase) return res.status(400).json({ ok: false, message: "Missing required parameters." });
    try {
        var normCat = normalizeFolderName(category);
        var normFolder = normalizeFolderName(folderName);
        var folderDir = getPortfolioFolderDir(normCat, normFolder);
        if (!folderDir) throw new Error("Invalid folder.");
        var ext = path.extname(oldName);
        if (!ext || !PORTFOLIO_ALLOWED_EXTS.has(ext.toLowerCase())) throw new Error("Invalid file type.");
        var sanitizedNewBase = sanitizeImageBaseName(newNameBase);
        var finalNewName = sanitizedNewBase + ext;

        var oldPath = path.join(folderDir, oldName);
        var newPath = path.join(folderDir, finalNewName);
        var resolvedFolder = path.resolve(folderDir);
        var resolvedOldPath = path.resolve(oldPath);
        var resolvedNewPath = path.resolve(newPath);
        if (!resolvedOldPath.startsWith(resolvedFolder + path.sep) || !resolvedNewPath.startsWith(resolvedFolder + path.sep)) {
            throw new Error("Invalid file name.");
        }

        await fs.promises.access(resolvedOldPath);

        if (oldName !== finalNewName) {
            try {
                await fs.promises.access(resolvedNewPath);
                throw new Error("A file with the new name already exists.");
            } catch (error) {
                if (error && error.message === "A file with the new name already exists.") {
                    throw error;
                }
            }
            await fs.promises.rename(resolvedOldPath, resolvedNewPath);

            // Best-effort cleanup for legacy DB records.
            var fileItem = await PortfolioItem.findOne({ category: normCat, folder: normFolder, name: oldName }).catch(function () {
                return null;
            });
            if (fileItem) {
                fileItem.name = finalNewName;
                await fileItem.save().catch(function () {});
            }

            var order = await readPortfolioFileOrder(category, folderName);
            var orderIndex = order.indexOf(oldName);
            if (orderIndex > -1) {
                order[orderIndex] = finalNewName;
                await writePortfolioFileOrder(category, folderName, order);
            }
        }
        
        var coverName = await getPortfolioCoverFileName(category, folderName);
        if (coverName && coverName === oldName) {
            await setPortfolioCoverFileName(category, folderName, finalNewName);
        }
        var files = await listPortfolioFilesOrdered(category, folderName);
        var coverFile = await resolvePortfolioCoverFile(category, folderName, files);
        return res.json({ ok: true, message: "File renamed successfully.", files: files, coverFileName: coverFile ? coverFile.name : "" });
    } catch (error) {
        if (error.message.includes("already exists")) return res.status(409).json({ ok: false, message: error.message });
        if (error && error.code === "ENOENT") return res.status(404).json({ ok: false, message: "File not found." });
        return res.status(500).json({ ok: false, message: error.message || "Unable to rename file." });
    }
});

router.post("/portfolio-files/reorder", adminAuth, async function (req, res) {
    var category = normalizeFolderName(getRequestValue(req, "category"));
    var folderName = normalizeFolderName(getRequestValue(req, "folder"));
    var fileName = getRequestValue(req, "fileName");
    var sequence = Number(getRequestValue(req, "sequence"));
    if (!category || !folderName || !fileName || !sequence) return res.status(400).json({ ok: false, message: "Missing required parameters." });
    try {
        await reorderPortfolioFileSequence(category, folderName, fileName, sequence);
        var files = await listPortfolioFilesOrdered(category, folderName);
        var coverFile = await resolvePortfolioCoverFile(category, folderName, files);
        return res.json({ ok: true, message: "File sequence updated.", files: files, coverFileName: coverFile ? coverFile.name : "" });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message || "Unable to reorder file." });
    }
});

module.exports = router;
