const axios = require("axios");

// Zoho Web-to-Lead Endpoint
const ZOHO_ENDPOINT = "https://crm.zoho.in/crm/WebToLeadForm";

// Magazine Download Form (Form 2 - single target form now)
const MAGAZINE_FORM_ID = "webform736128000000824346";
const MAGAZINE_xnQsjsdp = "720f9139cb02224d64cc5aeff73db9005f465ab2730e39da353431dcb1023430";
const MAGAZINE_xmIwtLD  = "65e6b28d5296b04427701a1d7ca42502817609b9ddfb9fb3f6e06ce37fe146c8d00d862d54130301661ddbc145eb18dc";

/**
 * Split full name into first and last name
 * Zoho CRM requires Last Name
 */
function splitName(fullName) {
    const nameParts = (fullName || "").trim().split(/\s+/);
    let firstName = "";
    let lastName = "";
    if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
    } else {
        lastName = nameParts[0] || "User";
    }
    return { firstName, lastName };
}

/**
 * Format YYYY-MM-DD date to MMM D, YYYY (e.g. Jan 1, 2000) for Zoho Date fields
 */
function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Submit full user profile details on signup to the Magazine Download Webform
 */
async function submitSignupLead(user) {
    try {
        const { firstName, lastName } = splitName(user.name);
        const email = (user.email || "").trim();
        const phone = (user.phone || "").trim();

        const params = new URLSearchParams();
        params.append("xnQsjsdp", MAGAZINE_xnQsjsdp);
        params.append("zc_gad", "");
        params.append("xmIwtLD", MAGAZINE_xmIwtLD);
        params.append("actionType", "TGVhZHM=");
        params.append("returnURL", "null");
        params.append("aG9uZXlwb3Q", "");
        
        params.append("First Name", firstName);
        params.append("Last Name", lastName);
        params.append("Email", email);
        params.append("Phone", phone);
        
        // SSB Profile custom fields mapping
        params.append("LEADCF53", formatDate(user.dob));
        params.append("LEADCF25", user.ssbAspirant || "-None-");
        params.append("LEADCF1", user.servingCandidate || "-None-");
        params.append("LEADCF5", user.vtxHeard || "-None-");
        params.append("LEADCF8", user.youtubeSubscribed || "-None-");
        params.append("LEADCF7", user.podcastSubscribed || "-None-");
        params.append("LEADCF9", user.ssbExperience || "-None-");
        params.append("LEADCF51", formatDate(user.nextSsbDate));
        params.append("LEADCF17", Array.isArray(user.ssbBoards) ? user.ssbBoards.join(";") : "");
        params.append("LEADCF15", Array.isArray(user.ssbEntries) ? user.ssbEntries.join(";") : "");
        
        params.append("City", user.city || "");
        params.append("State", user.state || "");

        // Set Lead Source as "Magazine Downloads"
        params.append("Lead Source", "Magazine Downloads");

        const response = await axios.post(ZOHO_ENDPOINT, params.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            }
        });

        console.log(`[ZohoService] Signup lead successfully sent to Magazine Download form for ${email}. Status: ${response.status}`);
        return true;
    } catch (err) {
        console.error("[ZohoService] Error submitting signup lead to Zoho:", err.message);
        return false;
    }
}

module.exports = {
    submitSignupLead
};
