require('dotenv').config();
const https = require('https');

const targetNumber = '9884050857';
const message = `Candidate TEST has uploaded their PIQ form. Ready for review.`;

console.log('Testing SMS Notifications...');

// 1. Try Fast2SMS
if (process.env.FAST2SMS_API_KEY) {
  const f2sUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&flash=0&numbers=${targetNumber}`;
  const req1 = https.get(f2sUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('\n--- Fast2SMS Response ---\n', data));
  });
  req1.on('error', (e) => console.error('Fast2SMS Error:', e.message));
} else {
  console.log('Fast2SMS API Key not found in env');
}

// 2. Try MSG91 (using flow endpoint without template id, which might throw an error if DLT is strictly enforced on this endpoint)
if (process.env.MSG91_AUTHKEY) {
  const msg91Payload = JSON.stringify({
    sender: "SSBISV",
    route: "4",
    country: "91",
    sms: [{ message: message, to: [targetNumber] }]
  });
  
  const options = {
    hostname: 'api.msg91.com',
    path: '/api/v5/flow/',
    method: 'POST',
    headers: {
      'authkey': process.env.MSG91_AUTHKEY,
      'Content-Type': 'application/json',
      'Content-Length': msg91Payload.length
    }
  };
  
  const req2 = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('\n--- MSG91 Response ---\n', data));
  });
  req2.on('error', (e) => console.error('MSG91 Error:', e.message));
  req2.write(msg91Payload);
  req2.end();
} else {
  console.log('MSG91 Auth Key not found in env');
}
