const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/CheckAuth");
const bcrypt = require("bcryptjs");
const { UserDetails } = require("../model/UserDetails");
const { AdminUser } = require("../model/AdminUser");
const Franchise = require("../model/Franchise");

/**
 * GET /api/profile
 * Retrieves details for the currently logged-in user session
 */
router.get("/profile", checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        let user = await AdminUser.findById(userId).select("-password");
        let role = "admin";
        if (user) {
            role = user.role === "owner" ? "owner" : "admin";
        }
        
        if (!user) {
            user = await Franchise.findById(userId).select("-password");
            role = "franchise";
        }
        
        if (!user) {
            user = await UserDetails.findById(userId).select("-password");
            role = user ? (user.role || "student") : "";
        }
        
        if (!user) {
            return res.status(404).json({ error: "Profile not found" });
        }
        
        res.status(200).json({
            status: "ok",
            user: {
                name: user.name || "System User",
                email: user.email,
                phone: user.phone || "",
                role: role,
                assessorType: role === "assessor" ? (user.assessorType || null) : null,
                permissions: (role === "admin" || role === "owner") ? (user.permissions || []) : []
            }
        });
    } catch (error) {
        console.error("GET /profile Error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/profile
 * Updates basic details (name, phone) for the currently logged-in user
 */
router.put("/profile", checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone } = req.body;
        
        let user = await AdminUser.findById(userId);
        if (user) {
            if (name) user.name = name;
            if (phone !== undefined) user.phone = phone;
            await user.save();
            
            // Sync inside UserDetails if present
            const syncedUser = await UserDetails.findOne({ email: user.email.toLowerCase() });
            if (syncedUser) {
                if (name) syncedUser.name = name;
                if (phone !== undefined) syncedUser.phone = phone;
                await syncedUser.save();
            }
            return res.status(200).json({ status: "ok", message: "Admin profile updated successfully" });
        }
        
        user = await Franchise.findById(userId);
        if (user) {
            if (name) user.name = name;
            if (phone !== undefined) user.phone = phone;
            await user.save();
            
            // Sync inside UserDetails if present
            const syncedUser = await UserDetails.findOne({ email: user.email.toLowerCase() });
            if (syncedUser) {
                if (name) syncedUser.name = name;
                if (phone !== undefined) syncedUser.phone = phone;
                await syncedUser.save();
            }
            return res.status(200).json({ status: "ok", message: "Franchise profile updated successfully" });
        }
        
        user = await UserDetails.findById(userId);
        if (user) {
            if (name) user.name = name;
            if (phone !== undefined) user.phone = phone;
            await user.save();
            return res.status(200).json({ status: "ok", message: "Profile updated successfully" });
        }
        
        res.status(404).json({ error: "Profile account not found" });
    } catch (error) {
        console.error("PUT /profile Error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/profile/security
 * Changes password for the currently logged-in user after verifying current password
 */
router.put("/profile/security", checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current and new password are required" });
        }
        
        let user = await AdminUser.findById(userId);
        let userType = "admin";
        
        if (!user) {
            user = await Franchise.findById(userId);
            userType = "franchise";
        }
        
        if (!user) {
            user = await UserDetails.findById(userId);
            userType = "standard";
        }
        
        if (!user) {
            return res.status(404).json({ error: "Account not found" });
        }
        
        // Verify current password matches
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Current security password verification failed" });
        }
        
        // Update password appropriately based on model auto-hashing
        if (userType === "franchise") {
            const newHash = await bcrypt.hash(newPassword, 10);
            user.password = newHash;
        } else {
            user.password = newPassword;
        }
        await user.save();
        
        // Synchronize password change to standard UserDetails document if synced
        if (userType === "admin" || userType === "franchise") {
            const syncedUser = await UserDetails.findOne({ email: user.email.toLowerCase() });
            if (syncedUser) {
                syncedUser.password = newPassword; // plain text since UserDetails has pre-save hook
                await syncedUser.save();
            }
        }
        
        res.status(200).json({ status: "ok", message: "Password updated successfully!" });
    } catch (error) {
        console.error("PUT /profile/security Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
