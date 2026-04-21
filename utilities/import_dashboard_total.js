import mongoose from "mongoose";

// CONNECT TO EXISTING DB
mongoose.connect(
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0",
);

// IMPORT YOUR DATA
import { lgaDashboardData } from "./lgaDashboardData.js";

// FLEXIBLE SCHEMA
const lgaSchema = new mongoose.Schema({}, { strict: false });

// COLLECTION NAME
const LgaSummary = mongoose.model("lga_summary_total", lgaSchema);

async function run() {
  try {
    console.log("Clearing old document...");
    await LgaSummary.deleteMany({});

    console.log("Inserting single structured document...");

    await LgaSummary.create(lgaDashboardData);

    console.log("✅ Data imported as single document successfully!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

run();
