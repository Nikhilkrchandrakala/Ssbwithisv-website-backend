const jwt = require("jsonwebtoken");
const { UserDetails } = require("../model/UserDetails");

const authMiddleware = async (req, res, next) => {
    try {
        const token =
            req.headers.authorization?.split(" ")[1] || req.headers.token;

        console.log(token)

        if (!token) {
            return res.status(401).json({ message: "Token missing" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 🔥 IMPORTANT: yahan pura user lao (password chhod ke)
        const user = await UserDetails.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user; // 👈 pura user object
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;
