require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
    console.log('Testing Email via EMAIL_USER...');
    try {
        const transporter1 = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter1.sendMail({
            from: `"SSB With ISV" <${process.env.EMAIL_USER}>`,
            to: 'qcquantumclimb@gmail.com',
            subject: "Test Email from SSB with ISV (EMAIL_USER)",
            html: `<p>This is a test email to verify the current sender configuration.</p><p>Sent using: ${process.env.EMAIL_USER}</p>`,
        });
        console.log('Test email 1 sent successfully!');
    } catch (error) {
        console.error('Error sending test email 1:', error.message);
    }

    console.log('\nTesting Email via WEB_HEAD_EMAIL...');
    try {
        const transporter2 = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.WEB_HEAD_EMAIL,
                pass: process.env.WEB_HEAD_PASSWORD
            }
        });

        await transporter2.sendMail({
            from: `"SSB With ISV" <${process.env.WEB_HEAD_EMAIL}>`,
            to: 'qcquantumclimb@gmail.com',
            subject: "Test Email from SSB with ISV (WEB_HEAD_EMAIL)",
            html: `<p>This is a test email to verify the current sender configuration.</p><p>Sent using: ${process.env.WEB_HEAD_EMAIL}</p>`,
        });
        console.log('Test email 2 sent successfully!');
    } catch (error) {
        console.error('Error sending test email 2:', error.message);
    }
}

sendTestEmail();
