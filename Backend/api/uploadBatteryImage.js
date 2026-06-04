const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const checkAuth = require("../middlewares/CheckAuth");

const uploadDir = path.join(__dirname, "../uploads/battery");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

router.post("/uploadBatteryImage", checkAuth, upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Ensure consistent path format and construct full URL dynamically or relative
        const fileUrl = `/uploads/battery/${req.file.filename}`;
        
        res.status(200).json({
            message: "File uploaded successfully",
            url: `https://api.ssbwithisv.in${fileUrl}` // Explicit absolute URL to avoid missing domain context on Vercel
        });
    } catch (error) {
        console.error("Error in uploadBatteryImage:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
