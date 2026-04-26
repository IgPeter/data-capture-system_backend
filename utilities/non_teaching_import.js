// scripts/importNonTeachingStaff.js
import mongoose from "mongoose";
import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import { NonTeachingStaff } from "../models/NonTeachingStaff.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔌 DB CONNECTION
const MONGO_URI =
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0";

// 📄 FILE PATH
const filePath = path.join(__dirname, "../NON_TEACHING_SUBEB_PAYROLL.xlsx");

// 🧠 Safe date parser
const parseDate = (value) => {
  if (!value || value === "N/A" || value === "NULL") return null;

  if (typeof value === "number") {
    return new Date((value - 25569) * 86400 * 1000);
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

async function importData() {
  try {
    // ✅ Connect DB
    await mongoose.connect(MONGO_URI);
    console.log("🟢 MongoDB connected");

    // ✅ Read Excel
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${data.length} records`);

    // ✅ Format data
    const formattedData = data.map((row) => ({
      staffId: row.staff_id?.toString().trim(),

      surname: row.surname || "",
      first_name: row.first_name || "",
      middle_name: row.middle_name || "",

      date_of_birth: parseDate(row.date_of_birth),
      mobile_phone: row.mobile_phone || "",

      appt_date: parseDate(row.appt_date),

      current_grade_level: row.current_grade_level || "",
      current_step: row.current_step || "",
      salary_structure: row.salary_structure || "",

      current_designation: row.current_designation || "",
      dept: row.dept || "",
      mda: row.mda || "",

      retirement_date: parseDate(row.retirement_date),
    }));

    // ✅ Remove invalid records (no staffId)
    const validData = formattedData.filter((item) => item.staffId);

    console.log("📊 Total records:", formattedData.length);
    console.log("✅ Valid records (with staffId):", validData.length);

    // 🔍 Check for duplicate staffId
    const ids = validData.map((d) => d.staffId);
    const uniqueIds = new Set(ids);

    console.log("🧪 Unique IDs:", uniqueIds.size);
    console.log("🧪 Duplicate count:", ids.length - uniqueIds.size);

    // 🔍 Show duplicate staffIds
    const duplicateMap = {};

    validData.forEach((item) => {
      if (!duplicateMap[item.staffId]) {
        duplicateMap[item.staffId] = [];
      }
      duplicateMap[item.staffId].push(item);
    });

    const duplicates = Object.entries(duplicateMap).filter(
      ([_, records]) => records.length > 1,
    );

    console.log(`\n🔴 Duplicate staffId groups: ${duplicates.length}`);

    duplicates.forEach(([staffId, records], index) => {
      console.log(`\n--- Duplicate ${index + 1}: ${staffId} ---`);
      records.forEach((r, i) => {
        console.log(
          `#${i + 1}: ${r.surname} ${r.first_name} (${r.current_designation})`,
        );
      });
    });

    // 🚀 BULK UPSERT (no duplicates, no loss)
    const operations = validData.map((item) => ({
      updateOne: {
        filter: { staffId: item.staffId },
        update: { $set: item },
        upsert: true,
      },
    }));

    const result = await NonTeachingStaff.bulkWrite(operations);

    console.log("\n🎯 Import Summary:");
    console.log("🟢 Inserted:", result.upsertedCount);
    console.log("🟡 Updated:", result.modifiedCount);
    console.log("🔵 Matched (no change):", result.matchedCount);

    console.log("\n✅ Import completed successfully");

    process.exit();
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

importData();
