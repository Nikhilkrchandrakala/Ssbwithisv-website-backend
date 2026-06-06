require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'info@ssbwithisv.in',
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: '"SSB With ISV" <info@ssbwithisv.in>',
            to: 'qcquantumclimb@gmail.com',
            subject: "Verification from AI Assistant",
            html: `
                <p>Hello from SSB With ISV!</p>
                <p>If you check the sender of this email, it should say <b>info@ssbwithisv.in</b>.</p>
                <p>This confirms that the Gmail alias is working perfectly.</p>
            `,
        });
        console.log('Successfully sent test email to qcquantumclimb@gmail.com!');
    } catch (error) {
        console.error('Error sending test email:', error.message);
    }
}

sendTestEmail();
