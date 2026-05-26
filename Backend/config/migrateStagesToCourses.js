// config/migrateStagesToCourses.js
const { UserDetails } = require("../model/UserDetails");

const migrateStagesToCourses = async () => {
    try {
        console.log("🔄 Initializing candidate stage to course data migration...");
        const mapping = {
            "Screening": "full_course",
            "Psychology": "psych",
            "GTO": "group_testing",
            "Interview": "interview",
            "Conference": "ssb_ppdt",
            "Completed": "full_course"
        };

        for (const [oldVal, newVal] of Object.entries(mapping)) {
            // Find all matching users across database
            const result = await UserDetails.updateMany(
                { clinicalStage: oldVal },
                { $set: { clinicalStage: newVal } }
            );
            if (result.modifiedCount > 0) {
                console.log(`⚡ Migrated ${result.modifiedCount} records from legacy Stage '${oldVal}' to Course '${newVal}'`);
            }
        }
        console.log("✅ Candidate stage to course data migration synchronization check complete.");
    } catch (error) {
        console.error("❌ Error running stage to course migration:", error.message);
    }
};

module.exports = migrateStagesToCourses;
