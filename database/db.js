import mongoose from "mongoose";

// ✅ MongoDB connection
export async function connectMongo() {
  console.log(process.env.userResetString12);
  console.log(process.env.PORT);
  try {
    await mongoose.connect(process.env.userResetString12, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Retry connection every 5s
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
