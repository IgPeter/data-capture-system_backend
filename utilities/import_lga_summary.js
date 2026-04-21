import mongoose from "mongoose";

// CONNECT
mongoose.connect(
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0",
);

// PASTE your lgaDummyData here OR import it
import { lgaDashboardData } from "./lgaDashboardData.js";

// FLEXIBLE SCHEMA
const lgaSummarySchema = new mongoose.Schema({}, { strict: false });
const LgaSummaryTotal = mongoose.model("lga_summary_total", lgaSummarySchema);

async function run() {
  try {
    console.log("Clearing old data...");
    await LgaSummaryTotal.deleteMany({});

    let documents = [];

    for (let lga in lgaDashboardData) {
      let years = lgaDashboardData[lga];

      for (let year in years) {
        documents.push({
          lga,
          year: Number(year),
          data: years[year],
        });
      }
    }

    console.log("Inserting data...");
    await LgaSummaryTotal.insertMany(documents);

    console.log("✅ LGA Summary Imported Successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
