const express = require("express");
const router = express.Router();
const { exec } = require("child_process");

/**
 * POST /api/webhook/deploy
 * Secure GitHub Webhook receiver for push-triggered VPS auto-deployments.
 */
router.post("/webhook/deploy", (req, res) => {
    const { secret } = req.query;
    const expectedSecret = process.env.DEPLOY_WEBHOOK_SECRET || "Joint3servicesDeploySecret2026";

    if (secret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized: Invalid secret token" });
    }

    console.log("🚀 GitHub Webhook Triggered: Commencing VPS Auto-Deploy...");

    // Send success response immediately to GitHub to prevent timeout/failure status
    res.status(200).json({
        status: "ok",
        message: "Deployment triggered successfully. Processing updates on the VPS..."
    });

    // Execute Git pull and PM2 reload in the background asynchronously
    // This ensures Express responds to GitHub before the PM2 restart kills the current process.
    setTimeout(() => {
        // 1. Pull Backend Updates
        exec("git pull origin main", { cwd: "/var/www/ssbwithisv/Backend" }, (err, stdout, stderr) => {
            if (err) {
                console.error(`❌ [Webhook] Error pulling Backend: ${err.message}`);
            } else {
                console.log(`✅ [Webhook] Backend pulled successfully:\n${stdout}`);
            }

            // 2. Pull Admin UI Updates
            exec("git pull origin main", { cwd: "/var/www/ssbwithisv/admin" }, (errAdmin, stdoutAdmin, stderrAdmin) => {
                if (errAdmin) {
                    console.error(`❌ [Webhook] Error pulling Admin UI: ${errAdmin.message}`);
                } else {
                    console.log(`✅ [Webhook] Admin UI pulled successfully:\n${stdoutAdmin}`);
                }

                // 3. Restart PM2 processes to apply changes
                console.log("🔄 [Webhook] Restarting all processes with PM2...");
                exec("pm2 restart all", (errPm2, stdoutPm2, stderrPm2) => {
                    if (errPm2) {
                        console.error(`❌ [Webhook] Error restarting PM2: ${errPm2.message}`);
                    } else {
                        console.log("✅ [Webhook] All PM2 processes restarted successfully.");
                    }
                });
            });
        });
    }, 1000);
});

module.exports = router;
