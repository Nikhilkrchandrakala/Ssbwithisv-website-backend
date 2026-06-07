const express = require("express");
const router = express.Router();
const { Lead } = require("../model/LeadDetails");
const { UserDetails } = require("../model/UserDetails");

// Get all Lead entries
router.get("/allLeads", async (req, res) => {
  try {
    const rawLeads = await Lead.find({}).sort({ date: -1, time: -1 }).lean();
    
    const userLeads = await UserDetails.find({ role: 'lead' }).sort({ createdAt: -1 }).lean();
    
    const mappedUserLeads = userLeads.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phone || "N/A",
        date: u.createdAt || new Date(),
        time: u.createdAt ? new Date(u.createdAt).toLocaleTimeString() : "N/A",
        isRegisteredLead: true
    }));
    
    const data = [...rawLeads, ...mappedUserLeads];
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});


// Add a new Lead entry
router.post("/addLead", async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    const newLead = new Lead({ name, email, phoneNumber });
    await newLead.save();
    const allLeads = await Lead.find({});
    res.status(201).send({ message: "Successfully created a new lead", data: allLeads });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Check if phone number already exists
router.get("/checkPhoneNumber/:phoneNumber", async (req, res) => {
  try {
    const lead = await Lead.findOne({ phoneNumber: req.params.phoneNumber });
    if (lead) {
      return res.status(200).send({ exists: true, message: "Phone number already exists" });
    }
    res.status(200).send({ exists: false, message: "Phone number is available" });
  } catch (err) {
    res.status(500).send({ message: "Server error" });
  }
});

// Delete a Lead entry
router.delete("/leads/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Elevate a Lead to a registered User (paid candidate)
router.post("/leads/:id/elevate", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check if user already exists with this email or phone
    const emailLower = (lead.email || "").toLowerCase().trim();
    const phone = (lead.phoneNumber || "").replace(/\D/g, "");
    const last10 = phone.length >= 10 ? phone.slice(-10) : phone;

    const existingUser = await UserDetails.findOne({
      $or: [
        { email: { $regex: new RegExp("^" + emailLower + "$", "i") } },
        ...(last10 ? [{ phone: { $regex: new RegExp(last10 + "$") } }] : [])
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        error: "This lead is already a registered user",
        user: { name: existingUser.name, email: existingUser.email, role: existingUser.role }
      });
    }

    // Create a new user from the lead with a temporary password
    const tempPassword = "password123";
    const newUser = new UserDetails({
      name: (lead.name || "").trim(),
      email: emailLower,
      phone: last10,
      password: tempPassword,
      role: "student",
      batch: "",
      isManuallyCreated: true
    });

    await newUser.save();

    res.status(201).json({
      message: "Lead elevated to registered candidate successfully",
      user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

