// reassignFacilitiesBackup.js

import mongoose from "mongoose";

// ===================================
// CONFIG
// ===================================
const MONGO_URI =
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0"; // change this

// ===================================
// CONNECT
// ===================================
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("🟢 MongoDB connected"))
  .catch((err) => {
    console.error("🔴 MongoDB connection failed:", err);
    process.exit(1);
  });

// ===================================
// MODELS (BACKUP COLLECTIONS ONLY)
// ===================================
const schoolSchema = new mongoose.Schema({}, { strict: false });
const facilitySchema = new mongoose.Schema({}, { strict: false });

const School = mongoose.model("SchoolBackup", schoolSchema, "schoolsBackup");

const Facility = mongoose.model(
  "FacilityUpdate",
  facilitySchema,
  "facilities_update",
);

// ===================================
// HELPERS
// ===================================
function getDate(doc) {
  if (doc.dateCreated) return new Date(doc.dateCreated);
  if (doc.createdAt) return new Date(doc.createdAt);
  return new Date(0); // oldest fallback
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ===================================
// MAIN
// ===================================
async function run() {
  try {
    console.log("📊 Loading schoolsBackup...");

    const schools = await School.find({}, { _id: 1 }).lean();
    const schoolIds = schools.map((s) => s._id);

    console.log(`🏫 Total schoolsBackup: ${schoolIds.length}`);

    console.log("📊 Loading facilitiesBackup...");

    const facilities = await Facility.find({}).lean();

    console.log(`🏢 Total facilitiesBackup docs: ${facilities.length}`);

    // -----------------------------------
    // GROUP BY SCHOOL
    // -----------------------------------
    const grouped = new Map();

    for (const doc of facilities) {
      const key = doc.school?.toString();

      if (!key) continue;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    // -----------------------------------
    // FIND SCHOOLS WITHOUT FACILITY
    // -----------------------------------
    const schoolsWithFacility = new Set([...grouped.keys()]);

    const missingSchools = schoolIds.filter(
      (id) => !schoolsWithFacility.has(id.toString()),
    );

    console.log(`❌ Schools without facility: ${missingSchools.length}`);

    if (missingSchools.length === 0) {
      console.log("✅ Every school already has a facility.");
      process.exit(0);
    }

    // -----------------------------------
    // FIND REASSIGNABLE DOCS
    // Keep earliest, move later docs
    // -----------------------------------
    let movableDocs = [];

    for (const [schoolId, docs] of grouped.entries()) {
      if (docs.length <= 1) continue;

      docs.sort((a, b) => getDate(a) - getDate(b));

      // earliest remains, later ones movable
      const extras = docs.slice(1);

      extras.forEach((doc) => movableDocs.push(doc));
    }

    console.log(`📄 Movable later-date docs found: ${movableDocs.length}`);

    if (movableDocs.length === 0) {
      console.log("⚠️ No extra facility docs available.");
      process.exit(0);
    }

    // -----------------------------------
    // RANDOMIZE
    // -----------------------------------
    shuffle(movableDocs);
    shuffle(missingSchools);

    const totalMoves = Math.min(movableDocs.length, missingSchools.length);

    console.log(`🚀 Reassigning ${totalMoves} facility docs...`);

    let moved = 0;

    for (let i = 0; i < totalMoves; i++) {
      const facilityDoc = movableDocs[i];
      const targetSchoolId = missingSchools[i];

      await Facility.updateOne(
        { _id: facilityDoc._id },
        {
          $set: {
            school: targetSchoolId,
          },
        },
      );

      moved++;

      if (moved % 50 === 0) {
        console.log(`✅ ${moved} moved so far...`);
      }
    }

    console.log("=================================");
    console.log("🎉 COMPLETED");
    console.log(`Moved docs: ${moved}`);
    console.log(
      `Unresolved schools (if any): ${missingSchools.length - moved}`,
    );
    console.log("=================================");
  } catch (error) {
    console.error("🔴 Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

run();
