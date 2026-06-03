require('dotenv').config();
const nodemailer = require('nodemailer');

async function testZohoSMTP() {
    console.log('Testing Zoho SMTP with info@ssbwithisv.in...');
    console.log(`Using Password: ${process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-2) : 'NONE'}`);
    
    // Test 1: Zoho India (.in)
    try {
        console.log('\n--> Trying smtp.zoho.in (Zoho India)...');
        const transporterIN = nodemailer.createTransport({
            host: "smtp.zoho.in",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        
        await transporterIN.sendMail({
            from: `"SSB Test" <${process.env.EMAIL_USER}>`,
            to: 'qcquantumclimb@gmail.com',
            subject: "Zoho India SMTP Test",
            html: `<p>This test email was sent via smtp.zoho.in</p>`,
        });
        console.log('SUCCESS! Email sent via smtp.zoho.in');
        return; // Stop if successful
    } catch (error) {
        console.error('Failed on smtp.zoho.in:', error.message);
    }

    // Test 2: Zoho Global (.com)
    try {
        console.log('\n--> Trying smtp.zoho.com (Zoho Global)...');
        const transporterCOM = nodemailer.createTransport({
            host: "smtp.zoho.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        
        await transporterCOM.sendMail({
            from: `"SSB Test" <${process.env.EMAIL_USER}>`,
            to: 'qcquantumclimb@gmail.com',
            subject: "Zoho Global SMTP Test",
            html: `<p>This test email was sent via smtp.zoho.com</p>`,
        });
        console.log('SUCCESS! Email sent via smtp.zoho.com');
    } catch (error) {
        console.error('Failed on smtp.zoho.com:', error.message);
    }
}

testZohoSMTP();
