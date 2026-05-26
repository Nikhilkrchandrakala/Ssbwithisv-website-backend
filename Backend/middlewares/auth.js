const jwt = require("jsonwebtoken");
const { UserDetails } = require("../model/UserDetails");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        let token;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.headers.token) {
            token = req.headers.token;
        }

        console.log("TOKEN:", token);

        if (!token) {
            return res.status(401).json({ message: "Token missing" });
        }

        const decoded = jwt.verify(token.trim(), (process.env.JWT_SECRET || '').trim());

        const user = await UserDetails.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("JWT ERROR:", error.message);
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;