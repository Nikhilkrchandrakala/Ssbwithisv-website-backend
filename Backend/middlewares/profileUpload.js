const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadBlogImageDir = "./uploads/profile";
const uploadPath = uploadBlogImageDir; // 👈 Define the upload path


// 👇 Auto create folder if not exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
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