const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/CheckAuth");
const { UserDetails } = require("../model/UserDetails");

/**
 * GET /api/admin/all-users
 * Fetches every user account in the system for the comprehensive dashboard.
 */
router.get("/admin/all-users", checkAuth, async (req, res) => {
    try {
        const { search, roleFilter } = req.query;

        const query = {};

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            query.$and = [
                {
                    $or: [
                        { name: regex },
                        { email: regex },
                        { phone: regex }
                    ]
                }
            ];
        }

        if (roleFilter && roleFilter !== "all") {
            query.role = roleFilter;
        }

        const users = await UserDetails.find(query).sort({ createdAt: -1 });

        res.status(200).json({ status: "ok", users });
    } catch (error) {
        console.error("GET /admin/all-users error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
