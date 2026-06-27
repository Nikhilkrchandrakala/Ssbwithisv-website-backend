
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan"); // For logging
const numberMonitor = require("./api/NumberMonitor");
const magazinePdf = require("./api/MagazinePdf");
const Register = require("./api/Register");
const AdminRegister = require("./api/AdminRegister");
const loginUsers = require("./api/Login");
const AdminLoginUsers = require("./api/AdminLogin");
const forgotPassword = require("./api/forgotPassword");
const sendEmail = require("./api/SendEmail");
const verifyOtp = require("./api/VerifyOtp");
const userProfile = require("./api/UserProfile");
const blogRoutes = require("./api/blogRoutes");
const emailOtp = require("./api/emailOtp");
const GalleryRoute = require("./api/GalleryRoute");
const coursesRoute = require("./api/courseRoutes");
const slotRoute = require("./api/slotRoutes");
const orderRoutes = require("./api/orderRoutes");
const franchiseRoutes = require("./api/franchiseRoutes");
const contactSettings = require("./api/ContactSettings");

const couponRoutes = require("./api/couponRoutes");
const rolesRoutes = require("./api/rolesRoutes");
const studentRoutes = require("./api/studentRoutes");
const notificationRoutes = require("./api/notificationRoutes");
const allUsersRoutes = require("./api/allUsersRoutes");



const visitorRoute = require("./api/visitorRoute");
const socialAuthRoutes = require("./api/socialAuthRoutes");


const candidateRoutes = require("./api/candidateRoutes");
// app.use("/api/email-otp", require("./routes/emailOtp"));






// const sendOtp = require("./api/sendOtp");
const leads = require("./api/Leads");
const signupOtp = require("./api/signupOtp");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const { Lead } = require("./model/LeadDetails");
const compression = require("compression");

const app = express();

app.use(compression());

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"]
}));

app.options("*", cors());// Handle preflight requests

// 2. Other Middlewares
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session + Passport (required for OAuth) ───
const session = require("express-session");
const passport = require("./config/passport.config");

app.use(session({
    secret: (process.env.SESSION_SECRET || "ssb_oauth_secret_fallback"),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 15 * 60 * 1000 } // 15 min sessions (only for OAuth handshake)
}));
app.use(passport.initialize());
app.use(passport.session());


// Middleware: Connecting different Routes
app.use("/api", socialAuthRoutes); // OAuth must be early — before JSON body parser for redirects
app.use("/api", verifyOtp);
app.use("/api", numberMonitor);
app.use("/api", magazinePdf);
app.use("/api", Register);
app.use("/api", signupOtp);
app.use("/api", AdminRegister);
app.use("/api", loginUsers);

app.use("/api", AdminLoginUsers);


app.use("/api", forgotPassword);
app.use("/api", sendEmail);
app.use("/api", leads);
app.use("/api", userProfile);
app.use("/api", blogRoutes);
app.use("/api", emailOtp);
app.use("/api", visitorRoute);

app.use("/api", candidateRoutes);
app.use("/api", GalleryRoute);
app.use("/api", coursesRoute);
app.use("/api", slotRoute);
app.use("/api", orderRoutes);
app.use("/api", franchiseRoutes);
app.use("/api", couponRoutes);
app.use("/api", rolesRoutes);
app.use("/api", studentRoutes);
app.use("/api", contactSettings);
app.use("/api", require("./api/profileRoutes"));
app.use("/api", require("./api/webhookRoutes"));
app.use("/api", notificationRoutes);
app.use("/api", require("./api/uploadBatteryImage"));
app.use("/api", allUsersRoutes);

// app.use("/api", sendOtp);

// app.use(bodyParser.json({ limit: '100mb' })); 
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
const path = require("path");

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fs = require("fs");
const adminPath = fs.existsSync(path.join(__dirname, '../../SSB-Backend-Admin'))
    ? path.join(__dirname, '../../SSB-Backend-Admin')
    : fs.existsSync(path.join(__dirname, '../../admin-ssbwithisv'))
        ? path.join(__dirname, '../../admin-ssbwithisv')
        : path.join(__dirname, '../admin');

app.use('/admin', express.static(adminPath));
app.use('/assets', express.static(path.join(adminPath, 'assets')));

app.get("/admin-login", (req, res) => {
    res.sendFile(path.join(adminPath, "index.html"));
});

app.get("/", (req, res) => {
    res.status(200).send("Welcome to the API");
});

app.get("/api/debug-secret", (req, res) => {
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Access Denied: Debug routes are disabled in production" });
    }
    const secret = process.env.JWT_SECRET || 'NOT_SET';
    const length = secret.length;
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
        hash = (hash << 5) - hash + secret.charCodeAt(i);
        hash |= 0;
    }
    res.json({
        prefix: secret.substring(0, 10) + '...',
        length,
        hash
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Add CORS headers to error response
    const origin = req.headers.origin;
    const allowedOrigins = ["https://ssbwithisv.in", "https://www.ssbwithisv.in", "https://ssbwithisv-website-backend.vercel.app"];
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");

    res.status(err.status || 500).send({ 
        status: "error",
        message: err.message || "An internal server error occurred" 
    });
});

// Connect to the Database
connectDB();

// Listen to the PORT
const PORT = 5001;



app.listen(PORT, (err) => {
    if (err) {
        console.error("Error starting server:", err);
    } else {
        console.log(`Server running at port ${PORT}`);
    }
});
