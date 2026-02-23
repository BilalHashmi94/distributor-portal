const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const seedAdmin = require("./utils/seedAdmin");

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://distributor-frontend-eta.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/distributors", require("./routes/distributors"));
app.use("/api/reports", require("./routes/reports"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb+srv://muhammedbilalhashmi94_db_user:114QlQ9BwRoM1wdg@cluster0.6rij7pu.mongodb.net/",
  )
  .then(() => {
    console.log("✅ Connected to MongoDB");
    // Create default admin if none exists
    seedAdmin();
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5200;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
