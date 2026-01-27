const express = require("express");
const router = express.Router();
const Visitor = require("../model/Visitor");

// increment + get visitors
router.get("/visit", async (req, res) => {
    try {
        let visitor = await Visitor.findOne();

        if (!visitor) {
            visitor = new Visitor({ count: 1 });
        } else {
            visitor.count += 1;
        }

        await visitor.save();

        res.json({
            success: true,
            visits: visitor.count
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// only get count (no increment)
router.get("/visit-count", async (req, res) => {
    try {
        const visitor = await Visitor.findOne();
        res.json({ visits: visitor ? visitor.count : 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
