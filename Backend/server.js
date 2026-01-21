require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan"); // For logging
const numberMonitor = require("./api/NumberMonitor");
const magazinePdf = require("./api/MagazinePdf");
const Register = require("./api/Register");
const loginUsers = require("./api/Login");
const forgotPassword = require("./api/forgotPassword");
const sendEmail = require("./api/SendEmail");
const verifyOtp = require("./api/VerifyOtp");
// const sendOtp = require("./api/sendOtp");
const leads = require("./api/Leads");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const { Lead } = require("./model/LeadDetails");

const app = express();

// Middlewares
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "token", "authorization", "Authorization"],
    credentials: true,
}));

// Middleware: Connecting different Routes

app.use("/api", verifyOtp);
app.use("/api", numberMonitor);
app.use("/api", magazinePdf);
app.use("/api", Register);
app.use("/api", loginUsers);
app.use("/api", forgotPassword);
app.use("/api", sendEmail);
app.use("/api", leads);
// app.use("/api", sendOtp);

// app.use(bodyParser.json({ limit: '100mb' })); 
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(__dirname + '/uploads'));
app.get("/", (req, res) => {
    res.status(200).send("Welcome to the API");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).send({ message: err.message || "An internal server error occurred" });
});

// Connect to the Database

connectDB();

// Listen to the PORT
const PORT = 5000;

app.listen(PORT, (err) => {
    if (err) {
        console.error("Error starting server:", err);
    } else {
        console.log(`Server running at port ${PORT}`);
    }
});
