import mysql from "mysql2/promise";
import mongoose from "mongoose";

// source DB (old)
export const sourceDb = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "@Petergbandi12",
  database: "teacher_posting_data_db",
});

// target DB (new)
export const targetDb = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "@Petergbandi12",
  database: "lgaschool_db",
});

// Test connections
try {
  await sourceDb.connect();
  console.log("✅ Connected to source DB");
} catch (err) {
  console.error("❌ Source DB connection failed:", err.message);
}

try {
  await targetDb.connect();
  console.log("✅ Connected to target DB");
} catch (err) {
  console.error("❌ Target DB connection failed:", err.message);
}

// ✅ MongoDB connection
export async function connectMongo() {
  try {
    await mongoose.connect(
      `mongodb+srv://igagapeter477_db_admin:%40Petergbandi12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
