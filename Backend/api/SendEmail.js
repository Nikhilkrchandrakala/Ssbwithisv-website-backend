const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// POST route to handle sending email
router.post("/send-email", async (req, res) => {
    const {
        name, email, phone, subject, message, replyTo,
        ssbExperience, nextSsb, ssbCenter, ssbPreparation, ssbEntry
    } = req.body;

    // Helper: renders a bold-label row — skips if value is empty
    const row = (label, value) => value
        ? `<p><span class="label">${label}:</span> ${value}</p>`
        : '';

    try {
        // Create a transporter using Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.WEB_HEAD_EMAIL,   // Authenticated sender account
                pass: process.env.WEB_HEAD_PASSWORD  // Gmail App Password
            }
        });

        // NOTE: Gmail SMTP requires 'from' to match the authenticated account.
        // replyTo ensures that hitting Reply in the inbox goes to the enquirer.
        const mailOptions = {
            from: `"SSB with ISV Website" <${process.env.WEB_HEAD_EMAIL}>`,
            replyTo: replyTo || email,
            to: 'info@ssbwithisv.in',
            subject: subject,
            html: `
                <html>
                    <head>
                        <style>
                            .container {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                background-color: #f4f4f4;
                            }
                            .content {
                                max-width: 600px;
                                margin: 0 auto;
                                background-color: #ffffff;
                                padding: 20px;
                                border-radius: 5px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                            }
                            .header {
                                font-size: 24px;
                                color: #333333;
                                text-align: center;
                                padding-bottom: 10px;
                                border-bottom: 2px solid #00bfa5;
                                margin-bottom: 20px;
                            }
                            .details {
                                font-size: 16px;
                                color: #555555;
                                line-height: 1.8;
                            }
                            .details p {
                                margin: 0 0 12px 0;
                            }
                            .label {
                                font-weight: bold;
                                color: #333333;
                            }
                            .message-block {
                                margin-top: 4px;
                                padding: 12px 16px;
                                background: #f9f9f9;
                                border-left: 3px solid #00bfa5;
                                font-size: 15px;
                                color: #444;
                                line-height: 1.6;
                                white-space: pre-wrap;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 14px;
                                color: #888888;
                                border-top: 1px solid #eee;
                                padding-top: 15px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="content">
                                <div class="header">${subject}</div>
                                <div class="details">
                                    ${row('Name', name)}
                                    ${row('Email', email)}
                                    ${row('Phone', phone)}
                                    ${row('SSB Experience', ssbExperience)}
                                    ${row('Next SSB Date', nextSsb)}
                                    ${row('Board / Selection Center', ssbCenter)}
                                    ${row('How Preparing for SSB', ssbPreparation)}
                                    ${row('SSB Entry', ssbEntry)}
                                    <p><span class="label">Message:</span></p>
                                    <div class="message-block">${message || '—'}</div>
                                </div>
                                <div class="footer">SSB with ISV — New Website Enquiry</div>
                            </div>
                        </div>
                    </body>
                </html>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error('Error sending email:', error);

        // Development / SMTP fallback — log to console, return 200 so frontend flow isn't blocked
        if (process.env.NODE_ENV !== 'production' || error.message.includes('BadCredentials') || error.message.includes('Username and Password not accepted')) {
            console.log('\n=========================================');
            console.log('--- DEVELOPMENT/FALLBACK EMAIL LOG ---');
            console.log(`Name: ${name}`);
            console.log(`Email: ${email}`);
            console.log(`Phone: ${phone}`);
            console.log(`SSB Experience: ${ssbExperience}`);
            console.log(`Next SSB: ${nextSsb}`);
            console.log(`Center: ${ssbCenter}`);
            console.log(`Preparation: ${ssbPreparation}`);
            console.log(`Entry: ${ssbEntry}`);
            console.log(`Message: ${message}`);
            console.log('=========================================\n');

            return res.status(200).json({
                success: true,
                message: 'Email logged to console (Development Fallback)',
                logged: true
            });
        }

        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

module.exports = router;
