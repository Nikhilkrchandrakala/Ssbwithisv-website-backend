const multer = require("multer");
const path = require("path");
const fs = require("fs");

const os = require("os");

// Ensure upload directories exist for both PDF and images
const isVercel = process.env.VERCEL;
const uploadPdfDir = isVercel ? path.join(os.tmpdir(), 'magazine', 'pdf') : './uploads/magazine/pdf';
const uploadImageDir = isVercel ? path.join(os.tmpdir(), 'magazine', 'images') : './uploads/magazine/images';

try {
  if (!fs.existsSync(uploadPdfDir)) {
    fs.mkdirSync(uploadPdfDir, { recursive: true });
  }

  if (!fs.existsSync(uploadImageDir)) {
    fs.mkdirSync(uploadImageDir, { recursive: true });
  }
} catch (error) {
  console.log("Upload directory check skipped (Serverless Environment)");
}

// Multer configuration for saving Magazine PDFs and images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, uploadPdfDir); // Save PDFs in the PDF directory
    } else if (file.mimetype.startsWith("image/")) {
      cb(null, uploadImageDir); // Save images in the images directory
    } else {
      cb(new Error("Unsupported file type.")); // Handle unsupported file types
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save with a unique name
  },
});

// Multer upload configuration with size limit and enhanced error handling
const magazineUpload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Limit files to 10MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /pdf|jpeg|jpg|svg|jfif|png/; // Allow PDF and image files (jpeg, jpg, png)
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (mimeType && extName) {
      return cb(null, true);
    } else {
      return cb(new Error("Only PDF and image files (jpeg, svg, jpg, png) are allowed!")); // More descriptive error
    }
  },
});

module.exports = magazineUpload;
