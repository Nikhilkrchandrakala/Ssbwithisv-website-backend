const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================= CREATE BLOG IMAGE DIRECTORY ================= */

const uploadBlogImageDir = "./uploads/blogs/images";

try {
    if (!fs.existsSync(uploadBlogImageDir)) {
        fs.mkdirSync(uploadBlogImageDir, { recursive: true });
    }
} catch (error) {
    console.error("Error creating blog upload directory:", error);
}

/* ================= MULTER STORAGE ================= */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, uploadBlogImageDir);
        } else {
            cb(new Error("Unsupported file type"));
        }
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    },
});

/* ================= FILE FILTER ================= */

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|svg/;
    const extName = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimeType = allowedTypes.test(file.mimetype);

    if (mimeType && extName) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only image files are allowed (jpeg, jpg, png, webp, svg)"
            )
        );
    }
};

/* ================= EXPORT ================= */

const blogUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 🔥 5MB per image
    },
});

module.exports = blogUpload;
