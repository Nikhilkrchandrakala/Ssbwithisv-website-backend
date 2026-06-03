const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// POST route to handle sending email
router.post("/send-email", async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Create a transporter using Nodemailer (Zoho Configuration)
        const transporter = nodemailer.createTransport({
            host: "smtp.zoho.in", // Trying Zoho India server first
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,  
                pass: process.env.EMAIL_PASS   
            }
        });

        // Define the mail options
        const mailOptions = {
            from: '"SSB With ISV" <info@ssbwithisv.in>',
            to: 'info@ssbwithisv.in',  // Recipient's email
            replyTo: email, // Set the reply-to as the person who filled the form
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
                                    <p>${message}</p>
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

        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

module.exports = router;
