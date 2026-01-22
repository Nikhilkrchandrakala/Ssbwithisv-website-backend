const express = require("express");
const router = express.Router();
const Blog = require("../model/Blog");
const checkAuth = require("../middlewares/CheckAuth");
const blogUpload = require("../middlewares/blogUpload");

/* CREATE BLOG */
router.post("/addBlog", checkAuth, blogUpload.array("images", 10), async (req, res) => {
    try {
        const { title, shortDescription, content, authorName, authorQuote } = req.body;

        if (!title || !shortDescription || !content || !authorName) {
            return res.status(400).json({ message: "All required fields missing" });
        }

        const images = req.files ? req.files.map(f => f.path) : [];

        const blog = new Blog({
            title,
            shortDescription,
            content,
            images,
            authorName,
            authorQuote,
            createdBy: req.user.id,
        });

        await blog.save();
        res.status(201).json({ message: "Blog created successfully", data: blog });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* GET ALL BLOGS */
router.get("/allBlogs", async (req, res) => {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
});

/* UPDATE BLOG */
router.put("/updateBlog/:id", checkAuth, blogUpload.array("images", 10), async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog not found" });

        Object.assign(blog, req.body);

        if (req.files?.length) {
            blog.images.push(...req.files.map(f => f.path));
        }

        await blog.save();
        res.json({ message: "Blog updated successfully", data: blog });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* DELETE BLOG */
router.delete("/deleteBlog/:id", checkAuth, async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog deleted successfully" });
});

/* 🔥 MOST IMPORTANT LINE */
module.exports = router;
