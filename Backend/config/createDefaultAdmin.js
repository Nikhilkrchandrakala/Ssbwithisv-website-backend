const { AdminUser } = require("../model/AdminUser");

const createDefaultAdmin = async () => {
    try {
        const existingAdmin = await AdminUser.findOne({
            email: "info@ssbwithisv.in"
        });

        if (!existingAdmin) {
            const admin = new AdminUser({
                email: "info@ssbwithisv.in",
                password: "1234"
            });

            await admin.save();

            console.log("✅ Default Admin Created Successfully");
            console.log("📧 Email: info@ssbwithisv.in");
            console.log("🔑 Password: 1234");
        } else {
            console.log("ℹ️ Default Admin Already Exists");
        }
    } catch (error) {
        console.error("❌ Error creating default admin:", error.message);
    }
};


module.exports = { createDefaultAdmin };