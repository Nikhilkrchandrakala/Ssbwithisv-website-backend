const express = require("express");
const router = express.Router();
const Gallery = require("../model/Gallery");
const checkAuth = require("../middlewares/CheckAuth");
const galleryUpload = require("../middlewares/galleryUpload");

const fs = require("fs");
const path = require("path");

const uploadPath = path.join(__dirname, "../uploads/gallery/images");

// 1

// ✅ CREATE GALLERY
router.post(
    "/addGallery",
    checkAuth,
    galleryUpload.array("images", 10), // max 10 images allowed
    async (req, res) => {
        try {
            const { title, imageTexts } = req.body;

            if (!title) {
                return res.status(400).json({ message: "Title is required" });
            }

            const BASE_URL = `${req.protocol}://${req.get("host")}`;

            let images = [];

            let parsedTexts = [];

            try {
                parsedTexts = imageTexts ? JSON.parse(imageTexts) : [];
            } catch {
                parsedTexts = [];
            }

            images = req.files.map((file, index) => ({
                imageUrl: `${BASE_URL}/uploads/gallery/images/${file.filename}`,
                imageText: parsedTexts[index] || "",
            }));

            const gallery = new Gallery({
                title,
                images,
                createdBy: req.user.id,
            });

            await gallery.save();

            res.status(201).json({
                message: "Gallery created",
                data: gallery,
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);



// ✅ GET ALL GALLERY
router.get("/allGallery", async (req, res) => {
    const data = await Gallery.find().sort({ createdAt: -1 });
    res.json(data);
});


// ✅ GET ONLY IMAGES (flat array)
router.get("/allGalleryImages", async (req, res) => {
    try {
        const galleries = await Gallery.find();

        // 🔥 flatten all images
        const allImages = galleries.flatMap(gallery => gallery.images);

        res.json(allImages);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ✅ DELETE IMAGE FROM GALLERY
router.put(
    "/updateGallery/:id",
    checkAuth,
    galleryUpload.array("images", 20),
    async (req, res) => {
        try {
            const gallery = await Gallery.findById(req.params.id);
            if (!gallery) return res.status(404).json({ message: "Not found" });

            let { imagesToDelete, imageTexts } = req.body;

            imagesToDelete = imagesToDelete ? JSON.parse(imagesToDelete) : [];

            /* DELETE IMAGES */
            if (imagesToDelete.length > 0) {
                gallery.images = gallery.images.filter((img) => {
                    const imgFile = img.imageUrl.split("/").pop();
                    return !imagesToDelete.some((delUrl) => {
                        const delFile = delUrl.split("/").pop();
                        return delFile === imgFile;
                    });
                });

                imagesToDelete.forEach((imgUrl) => {
                    const filename = imgUrl.split("/").pop();
                    const filePath = path.join(
                        __dirname,
                        "../uploads/gallery/images",
                        filename
                    );

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }

            /* ADD NEW IMAGES */
            if (req.files?.length) {
                const BASE_URL = `${req.protocol}://${req.get("host")}`;

                // const newImages = req.files.map((file, index) => ({
                //     imageUrl: `${BASE_URL}/${file.path.replace(/\\/g, "/")}`,
                //     imageText: imageTexts?.[index] || "",
                // }));

                const newImages = req.files.map((file, index) => ({
                    imageUrl: `${BASE_URL}/uploads/gallery/images/${file.filename}`,
                    imageText: parsedTexts[index] || ""
                }));

                gallery.images.push(...newImages);
            }

            await gallery.save();

            res.json({
                message: "Gallery updated",
                data: gallery,
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);



router.put(
    "/updateImageText/:galleryId",
    checkAuth,
    galleryUpload.single("image"),
    async (req, res) => {
        try {
            const { imageUrl, imageText } = req.body;

            if (!imageUrl) {
                return res.status(400).json({ message: "imageUrl is required" });
            }

            const gallery = await Gallery.findById(req.params.galleryId);
            if (!gallery) {
                return res.status(404).json({ message: "Gallery not found" });
            }

            // ✅ find image
            const image = gallery.images.find(img => img.imageUrl === imageUrl);

            if (!image) {
                return res.status(404).json({ message: "Image not found" });
            }

            // ✅ replace image file if a new file is uploaded
            if (req.file) {
                const BASE_URL = `${req.protocol}://${req.get("host")}`;
                const newImageUrl = `${BASE_URL}/uploads/gallery/images/${req.file.filename}`;

                // delete old file from disk
                const oldFilename = image.imageUrl.split("/").pop();
                const oldFilePath = path.join(__dirname, "../uploads/gallery/images", oldFilename);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }

                image.imageUrl = newImageUrl;
            }

            // ✅ update text
            image.imageText = imageText || "";

            await gallery.save();

            res.json({
                message: "Image description updated",
                data: gallery,
            });

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);



// ✅ DELETE GALLERY
router.delete("/deleteGallery/:id", checkAuth, async (req, res) => {
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
});

module.exports = router;