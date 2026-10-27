const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const apiRoutes = require("./routes/api");
const connectDatabase = require("./config/db");
const mongoose = require("mongoose");

const app = express();
let databaseConnection;
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((value) => value.trim());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "3mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    service: "peopledesk-api",
    time: new Date().toISOString(),
  }),
);
app.use("/api", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!databaseConnection) {
        databaseConnection = connectDatabase().catch((error) => {
          databaseConnection = null;
          throw error;
        });
      }
      await databaseConnection;
    }
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api", apiRoutes);
app.use((req, res) =>
  res.status(404).json({ message: "API route not found." }),
);
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error.code === 11000)
    return res
      .status(409)
      .json({ message: "A record with this unique value already exists." });
  if (error.name === "ValidationError")
    return res.status(422).json({
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(", "),
    });
  if (error.name === "CastError")
    return res
      .status(400)
      .json({ message: "The requested record ID is invalid." });
  if (error.name === "AbortError")
    return res
      .status(504)
      .json({ message: "The request timed out. Please try again." });
  if (error.message === "Origin is not allowed by CORS.")
    return res.status(403).json({ message: error.message });
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : error.message || "Internal server error.",
  });
});
module.exports = app;
