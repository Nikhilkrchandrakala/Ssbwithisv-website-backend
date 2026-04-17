// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const Course = require("../model/Course");
const checkAuth = require("../middlewares/CheckAuth");
const courseUpload = require("../middlewares/courseUpload");

const fs = require("fs");
const path = require("path");


// ✅ CREATE COURSE
router.post(
    "/addCourse",
    checkAuth,
    courseUpload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    async (req, res) => {
        try {
            const { title, description, price, duration, category } = req.body;

            if (!title) {
                return res.status(400).json({ message: "Title is required" });
            }

            const BASE_URL = `${req.protocol}://${req.get("host")}`;

            // ✅ thumbnail
            let thumbnail = "";
            if (req.files?.thumbnail) {
                thumbnail = `${BASE_URL}/uploads/courses/${req.files.thumbnail[0].filename}`;
            }

            // ✅ multiple images
            let images = [];
            if (req.files?.images) {
                images = req.files.images.map((file) => ({
                    imageUrl: `${BASE_URL}/uploads/courses/${file.filename}`,
                }));
            }

            const course = new Course({
                title,
                description,
                price,
                duration,
                category,
                thumbnail,
                images,
                createdBy: req.user.id,
            });

            await course.save();

            res.status(201).json({
                message: "Course created successfully",
                data: course,
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);



// ✅ GET ALL COURSES
router.get("/allCourses", async (req, res) => {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
});



// ✅ GET COURSE DETAIL
router.get("/courseDetail/:id", async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json(course);
});

// ✅ UPDATE COURSE
router.put(
    "/updateCourse/:id",
    checkAuth,
    courseUpload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    async (req, res) => {
        try {
            const course = await Course.findById(req.params.id);
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }

            let { title, description, price, duration, category, imagesToDelete } = req.body;

            const BASE_URL = `${req.protocol}://${req.get("host")}`;

            // ✅ parse delete images
            imagesToDelete = imagesToDelete ? JSON.parse(imagesToDelete) : [];

            /* =========================
               1. DELETE OLD IMAGES
            ========================= */
            if (imagesToDelete.length > 0) {
                course.images = course.images.filter((img) => {
                    const imgFile = img.imageUrl.split("/").pop();
                    return !imagesToDelete.some((delUrl) => {
                        const delFile = delUrl.split("/").pop();
                        return delFile === imgFile;
                    });
                });

                imagesToDelete.forEach((imgUrl) => {
                    const filename = imgUrl.split("/").pop();
                    const filePath = path.join(__dirname, "../uploads/courses", filename);

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }

            /* =========================
               2. UPDATE BASIC FIELDS
            ========================= */
            if (title) course.title = title;
            if (description) course.description = description;
            if (price) course.price = price;
            if (duration) course.duration = duration;
            if (category) course.category = category;

            /* =========================
               3. UPDATE THUMBNAIL
            ========================= */
            if (req.files?.thumbnail) {
                // delete old thumbnail
                if (course.thumbnail) {
                    const oldThumb = course.thumbnail.split("/").pop();
                    const oldPath = path.join(__dirname, "../uploads/courses", oldThumb);

                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }

                course.thumbnail = `${BASE_URL}/uploads/courses/${req.files.thumbnail[0].filename}`;
            }

            /* =========================
               4. ADD NEW IMAGES
            ========================= */
            if (req.files?.images) {
                const newImages = req.files.images.map((file) => ({
                    imageUrl: `${BASE_URL}/uploads/courses/${file.filename}`,
                }));

                course.images.push(...newImages);
            }

            await course.save();

            res.json({
                message: "Course updated successfully",
                data: course,
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    }
);



// ✅ DELETE COURSE
router.delete("/deleteCourse/:id", checkAuth, async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Not found" });

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully" });
});

module.exports = router;