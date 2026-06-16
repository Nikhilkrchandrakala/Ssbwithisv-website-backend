const express = require("express");
const router = express.Router();
const { MagazinePdf } = require("../model/MagazinePdfSchema");
const checkAuth = require("../middlewares/CheckAuth");
const magazineUpload = require("../middlewares/MagazinePdfUpload"); // Updated multer middleware
const fs = require("fs");

// --- Get All Magazine PDFs ---
router.get("/allMagazinePdfs", (req, res) => {
  MagazinePdf.find({}, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.status(200).send(data);
  });
});

// --- Get a specific Magazine PDF by ID ---
router.get("/magazinePdf/:id", (req, res) => {
  const id = req.params.id;

  MagazinePdf.findById(id, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    } else if (!data) {
      return res.status(404).send({ message: "Magazine PDF not found" });
    }
    res.status(200).send(data);
  });
});

// --- POST: Upload a new Magazine PDF and Front Image ---
router.post(
  "/addMagazinePdf",
  checkAuth,
  magazineUpload.fields([
    { name: "magazinePdf", maxCount: 1 },
    { name: "magazineFrontImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { pdfTitle, tags } = req.body; // 🔥 tags added

      if (!pdfTitle || !tags) {
        return res.status(400).json({ message: "Title and tags are required" });
      }

      const pdfFilePath = req.files["magazinePdf"][0].path.replace(/\\/g, "/");
      const magazineFrontImage = req.files["magazineFrontImage"][0].path.replace(/\\/g, "/");

      const newMagazinePdf = new MagazinePdf({
        pdfTitle,
        pdfFilePath,
        magazineFrontImage,
        tags, // 🔥 SAVE TAGS
      });

      const data = await newMagazinePdf.save();

      res.status(201).json({
        message: "Successfully uploaded Magazine PDF and image",
        data,
      });
    } catch (error) {
      console.error("Error during upload:", error);
      res.status(500).json({ message: error.message });
    }
  }
);


// --- PUT: Update an existing Magazine PDF and Front Image ---
router.put(
  "/updateMagazinePdf/:id",
  checkAuth,
  magazineUpload.fields([
    { name: "magazinePdf", maxCount: 1 },
    { name: "magazineFrontImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const { pdfTitle, tags } = req.body;   // ✅ tags bhi lo
    const id = req.params.id;

    try {
      const existingPdf = await MagazinePdf.findById(id);
      if (!existingPdf) {
        return res.status(404).send({ message: "Magazine PDF not found" });
      }

      // Update PDF file
      if (req.files && req.files["magazinePdf"]) {
        const oldPdfPath = existingPdf.pdfFilePath;
        fs.unlink(oldPdfPath, (err) => {
          if (err) console.error("Error deleting old PDF:", err);
        });
        existingPdf.pdfFilePath = req.files["magazinePdf"][0].path.replace(/\\/g, "/");
      }

      // Update Image
      if (req.files && req.files["magazineFrontImage"]) {
        const oldImagePath = existingPdf.magazineFrontImage;
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Error deleting old image:", err);
        });
        existingPdf.magazineFrontImage = req.files["magazineFrontImage"][0].path.replace(/\\/g, "/");
      }

      // ✅ Update title and tags
      if (pdfTitle) existingPdf.pdfTitle = pdfTitle;
      if (tags) existingPdf.tags = tags;

      await existingPdf.save();

      res.status(200).send({
        message: "Successfully updated the Magazine PDF and image",
        data: existingPdf,
      });
    } catch (error) {
      console.error("Error updating Magazine PDF:", error);
      res.status(500).send({
        message: "An error occurred while updating the PDF and image",
        error: error.message,
      });
    }
  }
);


// --- DELETE: Remove a Magazine PDF by ID ---
router.delete("/deleteMagazinePdf/:id", checkAuth, async (req, res) => {
  try {
    const id = req.params.id;

    // Find the existing PDF
    const existingPdf = await MagazinePdf.findById(id);
    if (!existingPdf) {
      return res.status(404).send({ message: "Magazine PDF not found" });
    }

    // Delete the PDF file from the server
    const pdfFilePath = existingPdf.pdfFilePath;
    fs.unlink(pdfFilePath, (err) => {
      if (err) {
        console.error("Error deleting PDF file:", err);
        return res.status(500).send({ message: "Error deleting PDF file", error: err.message });
      }
    });

    // Delete the front image from the server
    const imageFilePath = existingPdf.magazineFrontImage;
    fs.unlink(imageFilePath, (err) => {
      if (err) {
        console.error("Error deleting image file:", err);
        return res.status(500).send({ message: "Error deleting image file", error: err.message });
      }
    });

    // Remove the document from the database
    await MagazinePdf.findByIdAndDelete(id);
    res.status(200).send({ message: "Successfully deleted the Magazine PDF and image" });
  } catch (error) {
    console.error("Error deleting Magazine PDF:", error);
    res.status(500).send({ message: "An error occurred while deleting the PDF and image", error: error.message });
  }
});

module.exports = router;
