const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const financeRoutes = require("./routes/financeRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const eventRoutes = require("./routes/eventRoutes");
const reportRoutes = require("./routes/reportRoutes");
const activityRoutes = require("./routes/activityRoutes");
const userRoutes = require("./routes/userRoutes");
const curriculumRoutes = require("./routes/curriculumRoutes");
const examRoutes = require("./routes/examRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const classRoutes = require("./routes/classRoutes");
const dataResolutionRoutes = require("./routes/dataResolutionRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const studentDocumentRoutes = require("./routes/studentDocumentRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const studentTimelineRoutes = require("./routes/studentTimelineRoutes");
const teacherDocumentRoutes = require("./routes/teacherDocumentRoutes");
const teacherDutyRoutes = require("./routes/teacherDutyRoutes");
const teacherTimetableRoutes = require("./routes/teacherTimetableRoutes");
const teacherTimelineRoutes = require("./routes/teacherTimelineRoutes");

const employeeRoutes = require("./routes/employeeRoutes");
const employeeAttendanceRoutes = require("./routes/employeeAttendanceRoutes");
const employeeSalaryRoutes = require("./routes/employeeSalaryRoutes");
const teacherSalaryRoutes = require("./routes/teacherSalaryRoutes");
const path = require("path");

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
});

dotenv.config();

const app = express();

// 1. Security Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(compression());

// 2. Strict CORS Whitelist
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "https://dawat-ul-iman-git-main-arbajs-projects-fc7dac77.vercel.app",
  "https://dawat-ul-iman.vercel.app"
];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// 3. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes" }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login/auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts, please try again after 15 minutes" }
});

app.use("/api/", apiLimiter); // Apply general limiter to all API routes
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy" });
});

app.use("/api/students", studentRoutes);
app.use("/api/auth", authLimiter, authRoutes); // Apply strict limiter to auth routes
app.use("/api/teachers", teacherRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/calendar", eventRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/users", userRoutes);
app.use("/api/curriculums", curriculumRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/data-resolution", dataResolutionRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api", studentDocumentRoutes);
app.use("/api", hostelRoutes);
app.use("/api", studentTimelineRoutes);
app.use("/api", teacherDocumentRoutes);
app.use("/api", teacherDutyRoutes);
app.use("/api/teacher-timetable", teacherTimetableRoutes);
app.use("/api/teacher-timeline", teacherTimelineRoutes);

app.use("/api/employees", employeeRoutes);
app.use("/api/employee-attendance", employeeAttendanceRoutes);
app.use("/api/employee-salary", employeeSalaryRoutes);
app.use("/api/teacher-salary", teacherSalaryRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((req, res) => {
  console.log("404 FALLTHROUGH:", req.method, req.originalUrl);
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  // Always log the full error on the server side
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Resource not found or invalid ID format";
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate field value entered";
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  const response = {
    success: false,
    message: message
  };

  // Only expose stack traces in development mode
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

connectDB();

module.exports = app;
