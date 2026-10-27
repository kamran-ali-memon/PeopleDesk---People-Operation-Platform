const mongoose = require("mongoose");
mongoose.set("autoIndex", false);

async function connectDatabase() {
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is missing. Add it to backend/.env.");
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 2,
    waitQueueTimeoutMS: 10000,
  });
  const { initializeTenantDatabase } = require("../services/tenantMigration");
  await initializeTenantDatabase();
  console.log("MongoDB connected");
}

module.exports = connectDatabase;
