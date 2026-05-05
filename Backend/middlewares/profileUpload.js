const multer = require("multer");
const path = require("path");
const fs = require("fs");

const os = require("os");
const uploadPath = process.env.VERCEL ? path.join(os.tmpdir(), "profile") : "./uploads/profile";

// 👇 Auto create folder if not exists
try {
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
} catch (err) {
    console.log("Upload directory check skipped (Serverless Environment)");
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

module.exports = upload;