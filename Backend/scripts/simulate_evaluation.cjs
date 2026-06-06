const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
require('dotenv').config();
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }

const assessmentId = new ObjectId('6a0d70e0a2828aea6c6280dc');
const demoDossier = '/uploads/assessments/1779887335709-ANUJTESTFOROCR1.pdf';
const demoPiq = '/uploads/assessments/juliet-oscar-piq.pdf';

const MOCK_PIQ_DATA = `
# Candidate Profile: Anuj Rawat

## 1. Personal Information
*   **Name:** Anuj Rawat
*   **Age/DOB:** 21 (02-04-2003)
*   **Gender:** Male
*   **Marital Status:** Unmarried

## 2. Family Background
*   **Father:** Retd Subedar (Indian Army), Age 53, Education: 12th
*   **Mother:** Homemaker, Age 48, Education: 10th
*   **Siblings:** One younger brother (Age 19, Student)
*   **Family Income:** 45,000/- per month

## 3. Educational Qualifications
*   **10th/Matric:** CBSE Board, 85%, Year 2018
*   **12th/Intermediate:** CBSE Board, 82% (PCM), Year 2020
*   **Graduation:** B.Tech (Computer Science), 7.5 CGPA, Year 2024

## 4. SSB Entry Details
*   **Entry Type:** TGC-139 / SSC(Tech)-62
*   **Service Preference:** Indian Army
*   **Previous SSB Attempts:** None (Fresher)

## 5. Extracurriculars & Achievements
*   **Sports:** State-level Basketball player
*   **Hobbies:** Reading military history, Trekking
*   **Positions of Responsibility:** College Technical Fest Coordinator (2023)
*   **NCC:** 'C' Certificate holder (Army Wing)
`;

const MOCK_DOSSIER_OCR = `
--- Page Transcript ---

1. He is a hardworking boy who always helps his friends.
2. The situation demanded quick thinking, so he organized a rescue party.
3. She decided to pursue her dreams despite the obstacles.
4. They worked together to build a strong foundation for the future.
`;

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to DB. Starting simulation...");
        const db = mongoose.connection.db;

        const Order = db.collection('orders');
        const UserDetails = db.collection('users');
        const Submissions = db.collection('submissions');
        const Notifications = db.collection('notifications');
        const AdminUsers = db.collection('adminusers');

        const paidUserIds = await Order.distinct('userId', { status: 'paid' });
        const manualStudentIds = await UserDetails.distinct('_id', { role: 'student', isManuallyCreated: true });
        const allIds = [...paidUserIds, ...manualStudentIds];

        const students = await UserDetails.find({
            _id: { $in: allIds },
            role: { $nin: ['assessor', 'admin', 'franchise'] }
        }).sort({ createdAt: 1 }).toArray();

        const superAdmins = await AdminUsers.find({ role: 'admin' }).toArray();

        console.log(`Processing ${students.length} students...`);

        let newSubmissions = [];
        let newNotifications = [];

        for (const student of students) {
            const isPsychPath = !!student.assignedPsych;
            const isToPath = !!student.assignedTO;

            const submissionId = new ObjectId();
            const now = new Date();

            // 1. Create Submission
            const submission = {
                _id: submissionId,
                userId: student._id,
                assessmentId: assessmentId,
                status: 'REPORT_RELEASED',
                uploadedFiles: [demoDossier],
                piqFiles: [demoPiq],
                piqStatus: 'PARSED',
                piqParsedData: MOCK_PIQ_DATA,
                evaluation: MOCK_DOSSIER_OCR,
                workflowStage: 'EVALUATION_COMPLETED',
                gtoStatus: 'COMPLETED',
                ioStatus: 'COMPLETED',
                psychStatus: isPsychPath ? 'COMPLETED' : 'NOT_REQUIRED',
                toStatus: isToPath ? 'COMPLETED' : 'NOT_REQUIRED',
                gtoRemarks: "Good team player. Showed initiative in snake race.",
                ioRemarks: "Confident, clear communication. Good general awareness.",
                psychRemarks: isPsychPath ? "Stable profile. Good imaginative capacity in TAT." : "",
                toRemarks: isToPath ? "Strong technical grasp. Good problem-solving approach." : "",
                psychScores: {
                    "effective_intelligence": 7, "reasoning_ability": 8, "organizing_ability": 7, "power_of_expression": 8,
                    "social_adaptability": 7, "cooperation": 9, "sense_of_responsibility": 8, "initiative": 7,
                    "self_confidence": 8, "speed_of_decision": 7, "ability_to_influence_the_group": 7, "liveliness": 8,
                    "determination": 8, "courage": 7, "stamina": 8, "marks": 114
                },
                gtoScores: {
                    "effective_intelligence": 7, "reasoning_ability": 7, "organizing_ability": 8, "power_of_expression": 7,
                    "social_adaptability": 8, "cooperation": 9, "sense_of_responsibility": 7, "initiative": 8,
                    "self_confidence": 7, "speed_of_decision": 8, "ability_to_influence_the_group": 7, "liveliness": 8,
                    "determination": 9, "courage": 7, "stamina": 8, "marks": 115
                },
                ioScores: {
                    "effective_intelligence": 8, "reasoning_ability": 7, "organizing_ability": 7, "power_of_expression": 9,
                    "social_adaptability": 8, "cooperation": 8, "sense_of_responsibility": 9, "initiative": 7,
                    "self_confidence": 8, "speed_of_decision": 7, "ability_to_influence_the_group": 8, "liveliness": 7,
                    "determination": 8, "courage": 8, "stamina": 7, "marks": 117
                },
                toScores: {
                    "effective_intelligence": 7, "reasoning_ability": 9, "organizing_ability": 8, "power_of_expression": 7,
                    "social_adaptability": 7, "cooperation": 8, "sense_of_responsibility": 7, "initiative": 8,
                    "self_confidence": 9, "speed_of_decision": 7, "ability_to_influence_the_group": 8, "liveliness": 7,
                    "determination": 7, "courage": 8, "stamina": 7, "marks": 114
                },
                score: 114,
                reportVisibility: { psych: true, io: true, gto: true, to: true },
                createdAt: now,
                updatedAt: now
            };

            if (isPsychPath) {
                submission.psychMeetingDate = new Date(now.getTime() + 86400000); // +1 day
                submission.psychMeetingLink = `https://meet.google.com/demo-psych-${student.name.replace(/\s+/g, '').toLowerCase()}`;
            }
            if (isToPath) {
                submission.toMeetingDate = new Date(now.getTime() + 86400000);
                submission.toMeetingLink = `https://meet.google.com/demo-to-${student.name.replace(/\s+/g, '').toLowerCase()}`;
            }
            submission.ioMeetingDate = new Date(now.getTime() + 172800000); // +2 days
            submission.ioMeetingLink = `https://meet.google.com/demo-io-${student.name.replace(/\s+/g, '').toLowerCase()}`;

            newSubmissions.push(submission);

            // 2. PIQ Ready Notifications
            const createNotif = (recip, title, msg) => {
                if (!recip) return;
                newNotifications.push({
                    recipientId: recip,
                    studentId: student._id,
                    submissionId: submissionId,
                    title: title,
                    message: msg,
                    isRead: false,
                    createdAt: now,
                    updatedAt: now
                });
            };

            const piqMsg = `Candidate ${student.name} has uploaded their PIQ files.`;
            const dossierMsg = `Candidate ${student.name} has uploaded their Dossier.`;
            const evalMsg = `Candidate ${student.name} has completed their Evaluation.`;

            // PIQ Uploaded Notifs
            createNotif(student.assignedGTO, "PIQ Uploaded", piqMsg);
            createNotif(student.assignedIO, "PIQ Uploaded", piqMsg);
            if (isPsychPath) createNotif(student.assignedPsych, "PIQ Uploaded", piqMsg);
            if (isToPath) createNotif(student.assignedTO, "PIQ Uploaded", piqMsg);
            for (const admin of superAdmins) createNotif(admin._id, "PIQ Uploaded", piqMsg);

            // Dossier Uploaded Notifs
            createNotif(student.assignedGTO, "Dossier Uploaded", dossierMsg);
            createNotif(student.assignedIO, "Dossier Uploaded", dossierMsg);
            if (isPsychPath) createNotif(student.assignedPsych, "Dossier Uploaded", dossierMsg);
            if (isToPath) createNotif(student.assignedTO, "Dossier Uploaded", dossierMsg);
            for (const admin of superAdmins) createNotif(admin._id, "Dossier Uploaded", dossierMsg);

            // Evaluation Completed Notifs
            createNotif(student.assignedGTO, "Candidate Evaluation Completed", evalMsg);
            createNotif(student.assignedIO, "Candidate Evaluation Completed", evalMsg);
            if (isPsychPath) createNotif(student.assignedPsych, "Candidate Evaluation Completed", evalMsg);
            if (isToPath) createNotif(student.assignedTO, "Candidate Evaluation Completed", evalMsg);
            for (const admin of superAdmins) createNotif(admin._id, "Candidate Evaluation Completed", evalMsg);

            // 3. Meeting Scheduled Notifications
            if (isPsychPath) {
                createNotif(student._id, "Meeting Scheduled", `Psychologist has scheduled a meeting on ${submission.psychMeetingDate}`);
            }
            if (isToPath) {
                createNotif(student._id, "Meeting Scheduled", `Technical Officer has scheduled a meeting on ${submission.toMeetingDate}`);
            }
            createNotif(student._id, "Meeting Scheduled", `Interviewing Officer has scheduled a meeting on ${submission.ioMeetingDate}`);

            // 4. Report Released Notifications
            createNotif(student._id, "Results Released", "Your final evaluation report is now available.");
            createNotif(student.assignedGTO, "Results Released", `The evaluation report for ${student.name} is now available.`);
            createNotif(student.assignedIO, "Results Released", `The evaluation report for ${student.name} is now available.`);
            if (isPsychPath) createNotif(student.assignedPsych, "Results Released", `The evaluation report for ${student.name} is now available.`);
            if (isToPath) createNotif(student.assignedTO, "Results Released", `The evaluation report for ${student.name} is now available.`);
        }

        await Submissions.insertMany(newSubmissions);
        console.log(`Inserted ${newSubmissions.length} submissions.`);

        await Notifications.insertMany(newNotifications);
        console.log(`Inserted ${newNotifications.length} notifications.`);

        process.exit(0);
    }).catch(e => {
        console.error("Simulation error:", e);
        process.exit(1);
    });
