const zohoService = require("./services/zohoService");

async function runTests() {
    console.log("=== Starting Zoho Webform Lead Submission Tests ===");
    
    // Mock user for Signup
    const mockSignupUser = {
        name: "Test Lead User",
        email: "test.lead.signup@ssbwithisv.in",
        phone: "9999999999"
    };

    console.log("\n1. Testing submitSignupLead()...");
    const signupResult = await zohoService.submitSignupLead(mockSignupUser);
    console.log(`Signup Lead Result: ${signupResult ? "SUCCESS" : "FAILED"}`);

    // Mock user for Magazine Download (with full SSB details)
    const mockDownloadUser = {
        name: "Test Lead User",
        email: "test.lead.signup@ssbwithisv.in",
        phone: "9999999999",
        dob: "2000-01-01",
        ssbAspirant: "Yes",
        servingCandidate: "No",
        vtxHeard: "Yes",
        youtubeSubscribed: "Yes",
        podcastSubscribed: "No",
        ssbExperience: "Fresher",
        nextSsbDate: "2026-08-15",
        ssbBoards: ["1 AFSB", "2 AFSB"],
        ssbEntries: ["NDA", "CDS"],
        city: "New Delhi",
        state: "Delhi"
    };

    console.log("\n2. Testing submitMagazineDownloadLead()...");
    const downloadResult = await zohoService.submitMagazineDownloadLead(mockDownloadUser, "Roger That - July 2026");
    console.log(`Magazine Download Lead Result: ${downloadResult ? "SUCCESS" : "FAILED"}`);
    
    console.log("\n=== Tests Completed ===");
}

runTests();
