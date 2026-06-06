const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const API_BASE = 'http://localhost:5173/api';

if (!MONGODB_URI || !JWT_SECRET) { console.error('MONGODB_URI and JWT_SECRET env vars are required'); process.exit(1); }

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

async function runTest() {
  let user;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    user = await User.findOne({ email: 'qcquantumclimb@gmail.com' });
    if (!user) {
      console.log("Creating qcquantumclimb@gmail.com user for testing...");
      user = new User({ name: 'QC Test', email: 'qcquantumclimb@gmail.com', role: 'student' });
      await user.save();
    }
    console.log("User ID:", user._id.toString());
  } finally {
    mongoose.disconnect();
  }

  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: 'student', name: user.name },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  console.log("Testing GET /api/assessments...");
  let res = await fetch(`${API_BASE}/assessments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let assessments = await res.json();
  if (assessments.length === 0) {
    console.error("FAIL: Assessments returned empty array. The fallback logic is NOT working!");
    return;
  }
  const assessmentId = assessments[0]._id || assessments[0].id;
  console.log("SUCCESS: Fetched assessment ID:", assessmentId);

  console.log("Testing POST /api/submissions...");
  res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      assessmentId,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString()
    })
  });
  let submission = await res.json();
  if (!submission || (!submission.id && !submission._id)) {
    console.error("FAIL: Submission not created", submission);
    return;
  }
  const submissionId = submission._id || submission.id;
  console.log("SUCCESS: Created submission ID:", submissionId);

  console.log("Testing POST /api/submissions/:id/piq...");
  const dummyFile = 'test_piq_upload.pdf';
  fs.writeFileSync(dummyFile, 'Dummy PDF content');

  const form = new FormData();
  form.append('files', fs.createReadStream(dummyFile));

  res = await fetch(`${API_BASE}/submissions/${submissionId}/piq`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });

  const uploadResultText = await res.text();
  fs.unlinkSync(dummyFile);

  if (res.status === 200) {
    console.log("SUCCESS: PIQ Upload worked perfectly!");
    console.log("Journey simulation successful. Upload Result:", uploadResultText);
  } else {
    console.error("FAIL: PIQ Upload failed:", res.status, uploadResultText);
  }
}

runTest().catch(console.error);
