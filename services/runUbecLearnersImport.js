import mongoose from "mongoose";
import ExcelJS from "exceljs";
import dotenv from "dotenv";
import { School } from "../models/school.js";
import { Learners } from "../models/learners.js";

dotenv.config();

const MONGO_URI = process.env.userResetString12;
const FILE_PATH = "./ubec_update.xlsx";
const BATCH_SIZE = 50;

const toNumber = (value) => {
  if (!value || value === "NA") return 0;
  return Number(value) || 0;
};

const connectDB = async () => {
  await mongoose.connect(MONGO_URI, {
    autoIndex: false,
    maxPoolSize: 5,
  });
  console.log("✅ Mongo connected");
};

const runImport = async () => {
  await connectDB();

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(FILE_PATH);

  let currentLGA = null;
  let batch = [];
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for await (const worksheet of workbook) {
    for await (const row of worksheet) {
      if (row.number <= 2) continue;

      const lgaCell = row.getCell(1)?.value;
      const schoolCell = row.getCell(2)?.value;

      if (lgaCell) currentLGA = String(lgaCell).trim();
      if (!schoolCell) continue;

      const schoolName = String(schoolCell).trim();

      const school = await School.findOne({
        name: schoolName,
        lga: currentLGA,
      }).lean();

      if (!school) {
        skipped++;
        continue;
      }

      const doc = {
        school: school._id,
        capturedBy: "excel-import",
        dateCreated: new Date(),

        primary1: {
          pry1_male: toNumber(row.getCell(3)?.value),
          pry1_female: toNumber(row.getCell(4)?.value),
        },
        primary2: {
          pry2_male: toNumber(row.getCell(5)?.value),
          pry2_female: toNumber(row.getCell(6)?.value),
        },
        primary3: {
          pry3_male: toNumber(row.getCell(7)?.value),
          pry3_female: toNumber(row.getCell(8)?.value),
        },
        primary4: {
          pry4_male: toNumber(row.getCell(9)?.value),
          pry4_female: toNumber(row.getCell(10)?.value),
        },
        primary5: {
          pry5_male: toNumber(row.getCell(11)?.value),
          pry5_female: toNumber(row.getCell(12)?.value),
        },
        primary6: {
          pry6_male: toNumber(row.getCell(13)?.value),
          pry6_female: toNumber(row.getCell(14)?.value),
        },
      };

      batch.push({
        updateOne: {
          filter: { school: school._id, capturedBy: "excel-import" },
          update: doc,
          upsert: true,
        },
      });

      processed++;

      if (batch.length >= BATCH_SIZE) {
        const result = await Learners.bulkWrite(batch);
        updated += result.upsertedCount + result.modifiedCount;
        batch = [];

        console.log(
          `📦 Processed: ${processed} | Updated: ${updated} | Skipped: ${skipped}`,
        );
      }
    }
  }

  if (batch.length > 0) {
    const result = await Learners.bulkWrite(batch);
    updated += result.upsertedCount + result.modifiedCount;
  }

  console.log("🎉 UBEC import completed");
  console.log("Processed:", processed);
  console.log("Updated:", updated);
  console.log("Skipped:", skipped);

  await mongoose.disconnect();
  process.exit(0);
};

runImport().catch(async (err) => {
  console.error("❌ Import failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
