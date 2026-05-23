// config/seedCourses.js
const Course = require("../model/Course");

const seedCourses = async () => {
    const defaultCourses = [
        {
            courseId: "ssb_ppdt",
            title: "Introduction to SSB & PPDT, Stage 1 Process",
            description: "Complete stage 1 guidance covering screening, OIR, and PPDT.",
            price: 1999,
            category: "SSB",
            duration: "10 Days"
        },
        {
            courseId: "psych",
            title: "Psychology Test Preparation Program",
            description: "Psychology Test Prep + Mock Psych Test & detailed feedback.",
            price: 3499,
            category: "SSB",
            duration: "10 Days"
        },
        {
            courseId: "interview",
            title: "Interview Theory Course and Mock Interview",
            description: "Interview theory and 1-on-1 Mock Interview with feedback.",
            price: 2499,
            category: "SSB",
            duration: "10 Days"
        },
        {
            courseId: "group_testing",
            title: "Group Testing Course on VTX",
            description: "Complete GTO preparation using advanced virtual 3D simulation tools.",
            price: 7999,
            category: "SSB",
            duration: "10 Days"
        },
        {
            courseId: "full_course",
            title: "10 days Services Selection Board Hackathon (Full Course)",
            description: "Full bundled training including all individual modules and standard benefits.",
            price: 12499,
            category: "SSB",
            duration: "10 Days"
        }
    ];

    try {
        for (const defaultCourse of defaultCourses) {
            const existing = await Course.findOne({ courseId: defaultCourse.courseId });
            if (!existing) {
                const newCourse = new Course(defaultCourse);
                await newCourse.save();
                console.log(`✅ Seeded Course Module: ${defaultCourse.courseId} (₹${defaultCourse.price})`);
            } else {
                console.log(`ℹ️ Course Module already exists: ${defaultCourse.courseId} (₹${existing.price})`);
            }
        }
    } catch (error) {
        console.error("❌ Error seeding courses:", error.message);
    }
};

module.exports = { seedCourses };
