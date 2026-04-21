import mongoose from "mongoose";
import XLSX from "xlsx";

// CONNECT to existing DB
mongoose.connect(
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0",
);

// LOAD EXCEL FILE
const workbook = XLSX.readFile("New Subeb Report.xlsx");

// READ SHEETS
const schoolsSheet = XLSX.utils.sheet_to_json(workbook.Sheets["All Schools"], {
  defval: null,
});

const staffSheet = XLSX.utils.sheet_to_json(workbook.Sheets["All Staff"], {
  defval: null,
});

// CLEAN FUNCTION (remove junk columns only)
function cleanRow(row) {
  let cleaned = {};
  for (let key in row) {
    if (!key.startsWith("__EMPTY") && key.trim() !== "") {
      cleaned[key.trim()] = row[key];
    }
  }
  return cleaned;
}

const schoolsData = schoolsSheet.map(cleanRow);
const staffData = staffSheet.map(cleanRow);

// FLEXIBLE SCHEMAS
const schoolSchema = new mongoose.Schema({}, { strict: false });
const staffSchema = new mongoose.Schema({}, { strict: false });

// MODELS (ALT COLLECTIONS)
const SchoolAlt = mongoose.model("school_alt", schoolSchema);
const StaffAlt = mongoose.model("staffs_alt", staffSchema);

// INSERT DATA
async function run() {
  try {
    console.log("Clearing old data...");

    await SchoolAlt.deleteMany({});
    await StaffAlt.deleteMany({});

    console.log("Inserting schools...");
    await SchoolAlt.insertMany(schoolsData);

    console.log("Inserting staff...");
    await StaffAlt.insertMany(staffData);

    console.log("✅ Import completed successfully!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

run();
