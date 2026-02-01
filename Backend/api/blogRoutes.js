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
                timeDuration,   // ✅ new
                imageText       // ✅ new
            } = req.body;

            if (!title || !shortDescription || !content || !authorName) {
                return res.status(400).json({ message: "All required fields missing" });
            }

            const BASE_URL = `${req.protocol}://${req.get("host")}`;

            const images = req.files
                ? req.files.map(file =>
                    `${BASE_URL}/${file.path.replace(/\\/g, "/")}`
                )
                : [];

            const blog = new Blog({
                title,
                shortDescription,
                content,
                images,
                authorName,
                authorQuote,
                timeDuration,   // ✅ save
                imageText,      // ✅ save
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

            const { imagesToDelete, timeDuration, imageText } = req.body;

            // convert to array if single string
            const deleteImages = imagesToDelete
                ? Array.isArray(imagesToDelete)
                    ? imagesToDelete
                    : [imagesToDelete]
                : [];

            // remove old images
            if (deleteImages.length > 0) {
                blog.images = blog.images.filter(img => !deleteImages.includes(img));

                deleteImages.forEach(imgUrl => {
                    const filePath = path.join(
                        __dirname,
                        "../uploads/blogs/images",
                        path.basename(imgUrl)
                    );

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }

            // ✅ update fields
            blog.title = req.body.title;
            blog.shortDescription = req.body.shortDescription;
            blog.content = req.body.content;
            blog.authorName = req.body.authorName;
            blog.authorQuote = req.body.authorQuote;
            blog.timeDuration = timeDuration; // ✅ new
            blog.imageText = imageText;       // ✅ new

            // add new images
            if (req.files?.length) {
                const BASE_URL = `${req.protocol}://${req.get("host")}`;
                blog.images.push(
                    ...req.files.map(f =>
                        `${BASE_URL}/${f.path.replace(/\\/g, "/")}`
                    )
                );
            }

            await blog.save();

            res.json({
                message: "Blog updated successfully",
                data: blog,
            });
        } catch (err) {
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
