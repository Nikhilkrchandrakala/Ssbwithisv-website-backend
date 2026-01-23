const express = require("express");
const router = express.Router();
const Candidate = require("../model/Candidate");
const candidateUpload = require("../middlewares/candidateUpload");

/* ================= CREATE ================= */
router.post(
    "/addCandidate",
    candidateUpload.single("img"),
    async (req, res) => {
        try {
            const { name, entry, board, status } = req.body;

            if (!name || !entry || !board || !req.file) {
                return res
                    .status(400)
                    .json({ message: "Required fields missing" });
            }

            const BASE_URL = `${req.protocol}://${req.get("host")}`;

            const imageUrl = `${BASE_URL}/${req.file.path.replace(/\\/g, "/")}`;

            const candidate = new Candidate({
                name,
                entry,
                board,
                status,
                img: imageUrl,
            });

            await candidate.save();

            res.status(201).json({
                message: "Candidate added successfully",
                data: candidate,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

/* ================= READ ALL ================= */
router.get("/allCandidates", async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ createdAt: -1 });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/* ================= READ ONE ================= */
router.get("/candidate/:id", async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate)
            return res.status(404).json({ message: "Candidate not found" });

        res.json(candidate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/* ================= UPDATE ================= */
router.put(
    "/updateCandidate/:id",
    candidateUpload.single("img"),
    async (req, res) => {
        try {
            const candidate = await Candidate.findById(req.params.id);
            if (!candidate)
                return res.status(404).json({ message: "Candidate not found" });

            const { name, entry, board, status } = req.body;

            if (name) candidate.name = name;
            if (entry) candidate.entry = entry;
            if (board) candidate.board = board;
            if (status !== undefined) candidate.status = status;

            if (req.file) {
                const BASE_URL = `${req.protocol}://${req.get("host")}`;
                candidate.img = `${BASE_URL}/${req.file.path.replace(/\\/g, "/")}`;
            }

            await candidate.save();

            res.json({
                message: "Candidate updated successfully",
                data: candidate,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

/* ================= DELETE ================= */
router.delete("/deleteCandidate/:id", async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndDelete(req.params.id);
        if (!candidate)
            return res.status(404).json({ message: "Candidate not found" });

        res.json({ message: "Candidate deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
