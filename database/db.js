import mongoose from "mongoose";

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
