const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/CheckAuth");
const bcrypt = require("bcryptjs");
const { UserDetails } = require("../model/UserDetails");
const { AdminUser } = require("../model/AdminUser");
const Franchise = require("../model/Franchise");

// Generate unique referral code
function generateReferralCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "REF";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * GET /api/admin/users
 * Returns a normalized list of all users from all collections (users, adminusers, franchises)
 */
router.get("/admin/users", checkAuth, async (req, res) => {
    try {
        // Fetch all records
        const userDetails = await UserDetails.find().select("-password").lean();
        const adminUsers = await AdminUser.find().select("-password").lean();
        const franchises = await Franchise.find().select("-password").lean();

        // Convert lists into sets for fast duplicate matching
        const adminEmails = new Set(adminUsers.map(au => au.email.toLowerCase()));
        const franchiseEmails = new Set(franchises.map(f => f.email.toLowerCase()));

        const resultList = [];

        // 1. Normalize AdminUsers
        adminUsers.forEach(au => {
            const matchedUser = userDetails.find(ud => ud.email.toLowerCase() === au.email.toLowerCase());
            resultList.push({
                id: au._id,
                name: au.name || (matchedUser ? matchedUser.name : "System Admin"),
                email: au.email,
                phone: au.phone || (matchedUser ? matchedUser.phone : "N/A"),
                role: "admin",
                sourceCollection: "adminusers",
                permissions: au.permissions || [],
                assessorType: null,
                createdAt: au.createdAt
            });
        });

        // 2. Normalize Franchises
        franchises.forEach(f => {
            resultList.push({
                id: f._id,
                name: f.name || "Franchise Partner",
                email: f.email,
                phone: f.phone || "N/A",
                role: "franchise",
                commissionPercent: f.commissionPercent,
                referralCode: f.referralCode,
                sourceCollection: "franchises",
                assessorType: null,
                createdAt: f.createdAt
            });
        });

        // 3. Normalize Standard Users (excluding those already in admin or franchise)
        // Only include those who explicitly hold elevated roles like assessor, admin, or franchise
        userDetails.forEach(u => {
            const emailLower = u.email.toLowerCase();
            if (!adminEmails.has(emailLower) && !franchiseEmails.has(emailLower)) {
                if (u.role === "assessor" || u.role === "admin" || u.role === "franchise") {
                    resultList.push({
                        id: u._id,
                        name: u.name,
                        email: u.email,
                        phone: u.phone,
                        role: u.role,
                        assessorType: u.assessorType || null,
                        sourceCollection: "users",
                        createdAt: u.createdAt
                    });
                }
            }
        });

        // Sort by registration date descending
        resultList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({ status: "ok", users: resultList });
    } catch (error) {
        console.error("GET /admin/users Error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/users/:id/role
 * Changes the role of a user and handles the cross-collection mapping safely.
 */
router.put("/admin/users/:id/role", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, commissionPercent, phone, password, name: bodyName, permissions, assessorType } = req.body;

        const allowedRoles = ["student", "assessor", "admin", "franchise"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role specified" });
        }

        // Find existing record in any collection (only if id is a valid Mongo ObjectId)
        const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
        
        let userDoc = null;
        let adminDoc = null;
        let franchiseDoc = null;

        if (isValidId) {
            userDoc = await UserDetails.findById(id);
            adminDoc = await AdminUser.findById(id);
            franchiseDoc = await Franchise.findById(id);
        }

        let email = "";
        let name = "";
        let phoneVal = "";
        let passwordHash = "";

        if (userDoc) {
            email = userDoc.email;
            name = bodyName || userDoc.name || "";
            phoneVal = phone !== undefined ? phone : (userDoc.phone || "");
            passwordHash = userDoc.password;
        } else if (adminDoc) {
            email = adminDoc.email;
            name = bodyName || adminDoc.name || "System Admin";
            phoneVal = phone !== undefined ? phone : (adminDoc.phone || "");
            passwordHash = adminDoc.password;
        } else if (franchiseDoc) {
            email = franchiseDoc.email;
            name = bodyName || franchiseDoc.name || "Franchise Partner";
            phoneVal = phone !== undefined ? phone : (franchiseDoc.phone || "");
            passwordHash = franchiseDoc.password;
        }

        if (!email) {
            // Fallback: If not found by ID, search by email across collections in case ID is from source/target
            const queryEmail = req.body.email;
            if (queryEmail) {
                userDoc = await UserDetails.findOne({ email: queryEmail.toLowerCase() });
                adminDoc = await AdminUser.findOne({ email: queryEmail.toLowerCase() });
                franchiseDoc = await Franchise.findOne({ email: queryEmail.toLowerCase() });
                
                if (userDoc) {
                    email = userDoc.email; 
                    name = bodyName || userDoc.name || ""; 
                    phoneVal = phone !== undefined ? phone : (userDoc.phone || ""); 
                    passwordHash = userDoc.password;
                } else if (adminDoc) {
                    email = adminDoc.email; 
                    name = bodyName || adminDoc.name || "System Admin"; 
                    phoneVal = phone !== undefined ? phone : (adminDoc.phone || ""); 
                    passwordHash = adminDoc.password;
                } else if (franchiseDoc) {
                    email = franchiseDoc.email; 
                    name = bodyName || franchiseDoc.name || "Franchise Partner"; 
                    phoneVal = phone !== undefined ? phone : (franchiseDoc.phone || ""); 
                    passwordHash = franchiseDoc.password;
                } else {
                    // It's a completely new user! Let's assign provided details
                    email = queryEmail.toLowerCase();
                    name = bodyName || "User";
                    phoneVal = phone || "0000000000";
                    passwordHash = "";
                }
            }
        }

        if (!email) {
            return res.status(404).json({ error: "User account not found" });
        }

        const emailLower = email.toLowerCase();

        // If force password reset is requested, generate fresh hash
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        // 1. Promoting to ADMIN
        if (role === "admin") {
            // Delete from franchises if present
            await Franchise.deleteOne({ email: emailLower });

            // Create in AdminUser if not exists
            let existingAdmin = await AdminUser.findOne({ email: emailLower });
            if (!existingAdmin) {
                existingAdmin = new AdminUser({
                    email: emailLower,
                    name: name,
                    phone: phoneVal,
                    password: password || "1234", // plain text since pre-save hook hashes it
                    role: "admin",
                    permissions: permissions || []
                });
                await existingAdmin.save();
            } else {
                existingAdmin.phone = phoneVal;
                existingAdmin.name = name;
                existingAdmin.permissions = permissions || [];
                if (password) {
                    existingAdmin.password = password; // plain text since pre-save hook hashes it
                }
                await existingAdmin.save();
            }

            // Sync user role in userDetails
            if (userDoc) {
                userDoc.role = "admin";
                userDoc.phone = phoneVal;
                userDoc.name = name;
                userDoc.assessorType = null;
                if (password) {
                    userDoc.password = password; // plain text since pre-save hook hashes it
                }
                await userDoc.save();
            }
        }

        // 2. Promoting to FRANCHISE
        else if (role === "franchise") {
            // Delete from adminusers
            await AdminUser.deleteOne({ email: emailLower });

            // Create in Franchise if not exists
            let existingFranchise = await Franchise.findOne({ email: emailLower });
            if (!existingFranchise) {
                existingFranchise = new Franchise({
                    name: name || "Franchise Partner",
                    email: emailLower,
                    phone: phoneVal,
                    referralCode: generateReferralCode(),
                    commissionPercent: commissionPercent || 20,
                    password: passwordHash || "$2a$10$euy0iI6ZKpGQupm4p2rh9.yRMhQGfgBmwzNmdRH/cLMXROGuOHUZO", // manual hash (no pre-save hook)
                    isActive: true
                });
                await existingFranchise.save();
            } else {
                existingFranchise.phone = phoneVal;
                existingFranchise.name = name;
                if (commissionPercent) {
                    existingFranchise.commissionPercent = commissionPercent;
                }
                if (password) {
                    existingFranchise.password = passwordHash; // manual hash (no pre-save hook)
                }
                await existingFranchise.save();
            }

            // Sync user role in userDetails
            if (userDoc) {
                userDoc.role = "franchise";
                userDoc.phone = phoneVal;
                userDoc.name = name;
                userDoc.assessorType = null;
                if (password) {
                    userDoc.password = password; // plain text since pre-save hook hashes it
                }
                await userDoc.save();
            }
        }

        // 3. Demoting to STUDENT or ASSESSOR
        else {
            // Remove administrative status
            await AdminUser.deleteOne({ email: emailLower });
            await Franchise.deleteOne({ email: emailLower });

            // Update or create standard user document
            if (userDoc) {
                userDoc.role = role;
                userDoc.phone = phoneVal;
                userDoc.name = name;
                userDoc.assessorType = role === "assessor" ? (assessorType || null) : null;
                if (password) {
                    userDoc.password = password; // plain text since pre-save hook hashes it
                }
                await userDoc.save();
            } else {
                // If they only existed in adminusers/franchises, create a userDetails record
                const newUser = new UserDetails({
                    name: name || "User",
                    email: emailLower,
                    phone: phoneVal || "0000000000",
                    password: password || "1234", // plain text since pre-save hook hashes it
                    role: role,
                    assessorType: role === "assessor" ? (assessorType || null) : null
                });
                await newUser.save();
            }
        }

        res.status(200).json({ status: "ok", message: `User role configured successfully to ${role}` });
    } catch (error) {
        console.error("PUT /admin/users/:id/role Error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently deletes the user from AdminUser, Franchise, and UserDetails collections.
 */
router.delete("/admin/users/:id", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find by ID and remove across collections
        const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
        if (!isValidId) {
            return res.status(400).json({ error: "Invalid user ID format" });
        }

        // We want to find the user in any of the collections to get their email so we can clean up by email,
        // or delete directly by ID if matching.
        const userDoc = await UserDetails.findById(id);
        const adminDoc = await AdminUser.findById(id);
        const franchiseDoc = await Franchise.findById(id);

        let email = "";
        if (userDoc) email = userDoc.email;
        else if (adminDoc) email = adminDoc.email;
        else if (franchiseDoc) email = franchiseDoc.email;

        // Delete from all collections by ID
        await AdminUser.findByIdAndDelete(id);
        await Franchise.findByIdAndDelete(id);
        await UserDetails.findByIdAndDelete(id);

        // Fallback clean-up using email address to ensure absolutely no lingering cross-collection records
        if (email) {
            const emailLower = email.toLowerCase();
            await AdminUser.deleteMany({ email: emailLower });
            await Franchise.deleteMany({ email: emailLower });
            await UserDetails.deleteMany({ email: emailLower });
        }

        res.status(200).json({ status: "ok", message: "User account permanently removed from the system" });
    } catch (error) {
        console.error("DELETE /api/admin/users/:id Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
