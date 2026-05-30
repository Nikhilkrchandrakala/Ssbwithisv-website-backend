const express = require("express");
const router = express.Router();
const Notification = require("../model/Notification");
const checkAuth = require("../middlewares/CheckAuth"); // Assuming checkAuth middleware exists

/**
 * GET /api/notifications
 * Fetch notifications for the logged-in user.
 */
router.get("/notifications", checkAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id; // Using whatever is populated by checkAuth
        const notifications = await Notification.find({ recipientId: userId })
            .populate("studentId", "name email chestNo batch")
            .sort({ createdAt: -1 })
            .limit(50); // Get latest 50 notifications

        res.status(200).json(notifications);
    } catch (error) {
        console.error("GET /api/notifications error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a specific notification as read.
 */
router.put("/notifications/:id/read", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id || req.user.id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipientId: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: "Notification not found or unauthorized" });
        }

        res.status(200).json(notification);
    } catch (error) {
        console.error("PUT /api/notifications/:id/read error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the logged-in user.
 */
router.put("/notifications/read-all", checkAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        
        await Notification.updateMany(
            { recipientId: userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ status: "ok", message: "All notifications marked as read" });
    } catch (error) {
        console.error("PUT /api/notifications/read-all error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification.
 */
router.delete("/notifications/:id", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id || req.user.id;

        const notification = await Notification.findOneAndDelete({ _id: id, recipientId: userId });

        if (!notification) {
            return res.status(404).json({ error: "Notification not found or unauthorized" });
        }

        res.status(200).json({ status: "ok", message: "Notification deleted" });
    } catch (error) {
        console.error("DELETE /api/notifications/:id error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
