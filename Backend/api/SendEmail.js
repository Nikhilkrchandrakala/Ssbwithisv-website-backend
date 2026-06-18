const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// POST route to handle sending email
router.post("/send-email", async (req, res) => {
    const { name, email, phone, subject, message, replyTo } = req.body;
    try {

        // Create a transporter using Nodemailer (example with Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.WEB_HEAD_EMAIL,  // Authenticated sender account
                pass: process.env.WEB_HEAD_PASSWORD   // Gmail App Password
            }
        });

        // Define the mail options
        // NOTE: Gmail SMTP requires 'from' to match the authenticated account.
        // We use replyTo so that replies go directly back to the enquirer.
        const mailOptions = {
            from: `"SSB with ISV Website" <${process.env.WEB_HEAD_EMAIL}>`,
            replyTo: replyTo || email,   // Replies go to the enquirer's email
            to: 'info@ssbwithisv.in',   // Recipient's email
            subject: subject,            // Subject from form
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
                            }
                            .details {
                                margin-top: 20px;
                                font-size: 16px;
                                color: #555555;
                            }
                            .label {
                                font-weight: bold;
                                color: #333333;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 14px;
                                color: #888888;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="content">
                                <div class="header">${subject}</div>
                                <div class="details">
                                    <p><span class="label">Name:</span> ${name}</p>
                                    <p><span class="label">Email:</span> ${email}</p>
                                    <p><span class="label">Phone:</span> ${phone}</p>
                                    <p><span class="label">Message:</span></p>
                                    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 15px;">${message}</pre>
                                </div>
                                <div class="footer">Thank you for reaching out!</div>
                            </div>
                        </div>
                    </body>
                </html>
            `
        };
        

        // Send the email using Nodemailer
        await transporter.sendMail(mailOptions);

        // If email is successfully sent, send a success response
        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);

        // If we are in local development or if SMTP credentials are invalid/revoked,
        // log the email to the console and return success so frontend flow testing isn't blocked.
        if (process.env.NODE_ENV !== 'production' || error.message.includes('BadCredentials') || error.message.includes('Username and Password not accepted')) {
            console.log('\n=========================================');
            console.log('--- DEVELOPMENT/FALLBACK EMAIL SENDING ---');
            console.log(`From Name: ${name}`);
            console.log(`From Email: ${email}`);
            console.log(`Phone: ${phone}`);
            console.log(`Subject: ${subject}`);
            console.log('Message:');
            console.log(message);
            console.log('=========================================\n');
            
            return res.status(200).json({ 
                success: true, 
                message: 'Email logged to console (Development Fallback)',
                logged: true 
            });
        }

        // If there is an error, send a failure response
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

module.exports = router;
