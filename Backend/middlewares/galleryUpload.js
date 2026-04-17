const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ correct absolute path
const uploadPath = path.join(__dirname, "../uploads/gallery/images");

// ✅ create folder BEFORE multer uses it
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath); // ✅ use same path
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const galleryUpload = multer({ storage });

module.exports = galleryUpload;