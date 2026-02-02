const express = require("express");
const router = express.Router();
const Blog = require("../model/Blog");
const checkAuth = require("../middlewares/CheckAuth");
const blogUpload = require("../middlewares/blogUpload");

const fs = require("fs");
const path = require("path");


/* CREATE BLOG */
router.post(
    "/addBlog",
    checkAuth,
    blogUpload.array("images", 10),
    async (req, res) => {
        try {
            const {
                title,
                shortDescription,
                content,
                authorName,
                authorQuote,
                timeDuration,
                imageTexts // 👈 expect array
            } = req.body;

            if (!title || !shortDescription || !content || !authorName) {
                return res.status(400).json({ message: "All required fields missing" });
            }

            const BASE_URL = `${req.protocol}://${req.get("host")}`;

            let images = [];

            if (req.files && req.files.length > 0) {
                images = req.files.map((file, index) => ({
                    imageUrl: `${BASE_URL}/${file.path.replace(/\\/g, "/")}`,
                    imageText: Array.isArray(imageTexts)
                        ? imageTexts[index] || ""
                        : imageTexts || ""
                }));
            }

            const blog = new Blog({
                title,
                shortDescription,
                content,
                images, // 👈 now array of objects
                authorName,
                authorQuote,
                timeDuration,
                createdBy: req.user.id,
            });

            await blog.save();

            res.status(201).json({
                message: "Blog created successfully",
                data: blog,
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);


/* GET ALL BLOGS */
router.get("/allBlogs", async (req, res) => {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
});

/* UPDATE BLOG */

router.put(
    "/updateBlog/:id",
    checkAuth,
    blogUpload.array("images", 10),
    async (req, res) => {
        try {
            const blog = await Blog.findById(req.params.id);
            if (!blog) return res.status(404).json({ message: "Blog not found" });

            let {
                title,
                shortDescription,
                content,
                authorName,
                authorQuote,
                timeDuration,
                imageTexts,
                existingImageTexts,
                imagesToDelete
            } = req.body;

            // ✅ Parse arrays (FormData sends strings)
            imagesToDelete = imagesToDelete ? JSON.parse(imagesToDelete) : [];
            imageTexts = imageTexts ? (Array.isArray(imageTexts) ? imageTexts : [imageTexts]) : [];
            existingImageTexts = existingImageTexts
                ? JSON.parse(existingImageTexts)
                : [];

            /* ===== 1. DELETE OLD IMAGES ===== */
            /* ===== 1. DELETE OLD IMAGES (FULL OBJECT) ===== */
            if (imagesToDelete.length > 0) {

                blog.images = blog.images.filter(img => {
                    const imgFile = img.imageUrl.split("/").pop(); // abc.jpg

                    return !imagesToDelete.some(delUrl => {
                        const delFile = delUrl.split("/").pop();
                        return delFile === imgFile;
                    });
                });

                // delete files from folder
                imagesToDelete.forEach(imgUrl => {
                    const filename = imgUrl.split("/").pop();
                    const filePath = path.join(__dirname, "../uploads/blogs/images", filename);

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }


            /* ===== 2. UPDATE EXISTING IMAGE TEXTS ===== */
            /* ===== 2. UPDATE EXISTING IMAGE TEXTS ===== */
            if (existingImageTexts.length > 0) {
                blog.images = blog.images.map(img => {
                    const found = existingImageTexts.find(e => e.imageUrl === img.imageUrl);
                    return found
                        ? { ...img._doc, imageText: found.imageText }
                        : img;
                });
            }


            /* ===== 3. UPDATE NORMAL FIELDS ===== */
            blog.title = title;
            blog.shortDescription = shortDescription;
            blog.content = content;
            blog.authorName = authorName;
            blog.authorQuote = authorQuote;
            blog.timeDuration = timeDuration;

            /* ===== 4. ADD NEW IMAGES ===== */
            if (req.files?.length) {
                const BASE_URL = `${req.protocol}://${req.get("host")}`;

                const newImages = req.files.map((file, index) => ({
                    imageUrl: `${BASE_URL}/${file.path.replace(/\\/g, "/")}`,
                    imageText: imageTexts[index] || ""
                }));

                blog.images.push(...newImages);
            }

            await blog.save();

            res.json({
                message: "Blog updated successfully",
                data: blog
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    }
);





/* DELETE BLOG */
router.delete("/deleteBlog/:id", checkAuth, async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog deleted successfully" });
});

/* 🔥 MOST IMPORTANT LINE */
module.exports = router;
