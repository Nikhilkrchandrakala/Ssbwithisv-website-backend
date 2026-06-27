const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const { UserDetails } = require("../model/UserDetails");

// ─────────────────────────────────────────────────
// HELPER: Find or create user for any OAuth provider
// ─────────────────────────────────────────────────
async function findOrCreateOAuthUser({ oauthProvider, oauthId, email, name, profileImage }) {
    try {
        // 1. Try exact match by provider + oauthId (returning user via same provider)
        let user = await UserDetails.findOne({ oauthProvider, oauthId });

        if (!user && email) {
            // 2. Try to find existing account by email (link social to existing account)
            user = await UserDetails.findOne({
                email: { $regex: new RegExp("^" + email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") }
            });

            if (user) {
                // Link existing account to this OAuth provider
                user.oauthProvider = user.oauthProvider || oauthProvider;
                user.oauthId = user.oauthId || oauthId;
                if (!user.profileImage && profileImage) user.profileImage = profileImage;
                await user.save();
            }
        }

        if (!user) {
            // 3. Brand new user via social login — phone will be collected later via MSG91
            user = new UserDetails({
                name: name || "User",
                email: email || `${oauthProvider}_${oauthId}@noemail.local`,
                oauthProvider,
                oauthId,
                profileImage: profileImage || null,
                phoneVerified: false,
                emailVerified: true,
                role: "lead",
            });
            await user.save();
        }

        return user;
    } catch (err) {
        console.error(`[Passport] findOrCreateOAuthUser error (${oauthProvider}):`, err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────────
// Passport serialization (for session — minimal)
// ─────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserDetails.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ─────────────────────────────────────────────────
// GOOGLE Strategy (Optional)
// ─────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.API_BASE_URL || "https://api.ssbwithisv.in"}/api/auth/google/callback`,
                scope: ["openid", "profile", "email"],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value || null;
                    const name = profile.displayName || profile.name?.givenName || "Google User";
                    const profileImage = profile.photos?.[0]?.value || null;

                    const user = await findOrCreateOAuthUser({
                        oauthProvider: "google",
                        oauthId: profile.id,
                        email,
                        name,
                        profileImage,
                    });
                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );
} else {
    console.warn("[Passport] Google Strategy disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not in .env");
}

// ─────────────────────────────────────────────────
// FACEBOOK Strategy (Optional)
// ─────────────────────────────────────────────────
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
        new FacebookStrategy(
            {
                clientID: process.env.FACEBOOK_APP_ID,
                clientSecret: process.env.FACEBOOK_APP_SECRET,
                callbackURL: `${process.env.API_BASE_URL || "https://api.ssbwithisv.in"}/api/auth/facebook/callback`,
                profileFields: ["id", "displayName", "emails", "photos", "name"],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value || null;
                    const name = profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim() || "Facebook User";
                    const profileImage = profile.photos?.[0]?.value || null;

                    const user = await findOrCreateOAuthUser({
                        oauthProvider: "facebook",
                        oauthId: profile.id,
                        email,
                        name,
                        profileImage,
                    });
                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );
} else {
    console.warn("[Passport] Facebook Strategy disabled: FACEBOOK_APP_ID/FACEBOOK_APP_SECRET not in .env");
}

// ─────────────────────────────────────────────────
// LINKEDIN Strategy (Optional)
// ─────────────────────────────────────────────────
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(
        new LinkedInStrategy(
            {
                clientID: process.env.LINKEDIN_CLIENT_ID,
                clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
                callbackURL: `${process.env.API_BASE_URL || "https://api.ssbwithisv.in"}/api/auth/linkedin/callback`,
                scope: ["openid", "profile", "email"],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value || null;
                    const name = profile.displayName || "LinkedIn User";
                    const profileImage = profile.photos?.[0]?.value || null;

                    const user = await findOrCreateOAuthUser({
                        oauthProvider: "linkedin",
                        oauthId: profile.id,
                        email,
                        name,
                        profileImage,
                    });
                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );
} else {
    console.warn("[Passport] LinkedIn Strategy disabled: LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET not in .env");
}

module.exports = passport;

