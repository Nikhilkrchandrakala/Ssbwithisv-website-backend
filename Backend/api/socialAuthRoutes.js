const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const CLIENT_URL = process.env.CLIENT_URL || "https://ssbwithisv.in";

// ─────────────────────────────────────────────────
// HELPER: Build redirect URL after OAuth callback
// ─────────────────────────────────────────────────
function buildRedirectUrl(user) {
    const needsPhone = !user.phone || !user.phoneVerified;

    if (needsPhone) {
        // Issue a short-lived TEMP token (15 min) — only used to identify user on phone-verify page
        const tempToken = jwt.sign(
            { id: user._id, needsPhone: true },
            (process.env.JWT_SECRET || "").trim(),
            { expiresIn: "15m" }
        );
        const name = encodeURIComponent(user.name || "");
        const email = encodeURIComponent(user.email || "");
        return `${CLIENT_URL}/auth/phone-verify?temp=${tempToken}&name=${name}&email=${email}`;
    }

    // Existing user with phone — issue full 30-day JWT (same as normal login)
    const token = jwt.sign(
        { id: user._id, phone: user.phone, email: user.email, role: user.role || "lead" },
        (process.env.JWT_SECRET || "").trim(),
        { expiresIn: "30d" }
    );
    const userData = encodeURIComponent(
        JSON.stringify({ name: user.name, email: user.email, phone: user.phone })
    );
    return `${CLIENT_URL}/auth/callback?token=${token}&user=${userData}`;
}

// ─────────────────────────────────────────────────
// Generic OAuth error handler
// ─────────────────────────────────────────────────
function handleOAuthError(res, err) {
    console.error("[OAuth] Error:", err?.message || err);
    return res.redirect(`${CLIENT_URL}/SignIn?oauthError=true`);
}

// ─────────────────────────────────────────────────
// GOOGLE
// ─────────────────────────────────────────────────
router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["openid", "profile", "email"], session: true })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/SignIn?oauthError=true`, session: true }),
    (req, res) => {
        try {
            res.redirect(buildRedirectUrl(req.user));
        } catch (err) {
            handleOAuthError(res, err);
        }
    }
);

// ─────────────────────────────────────────────────
// FACEBOOK
// ─────────────────────────────────────────────────
router.get(
    "/auth/facebook",
    passport.authenticate("facebook", { scope: ["email", "public_profile"], session: true })
);

router.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: `${CLIENT_URL}/SignIn?oauthError=true`, session: true }),
    (req, res) => {
        try {
            res.redirect(buildRedirectUrl(req.user));
        } catch (err) {
            handleOAuthError(res, err);
        }
    }
);

// ─────────────────────────────────────────────────
// LINKEDIN
// ─────────────────────────────────────────────────
router.get(
    "/auth/linkedin",
    passport.authenticate("linkedin", { session: true })
);

router.get(
    "/auth/linkedin/callback",
    passport.authenticate("linkedin", { failureRedirect: `${CLIENT_URL}/SignIn?oauthError=true`, session: true }),
    (req, res) => {
        try {
            res.redirect(buildRedirectUrl(req.user));
        } catch (err) {
            handleOAuthError(res, err);
        }
    }
);

module.exports = router;
