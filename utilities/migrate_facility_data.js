import mongoose from "mongoose";

// -----------------------------
// Helpers
// -----------------------------

const wordsToNumbers = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function normalizeText(text) {
  return (text || "").toString().toLowerCase().trim();
}

function isNotAvailable(text) {
  const t = normalizeText(text);
  return (
    !t || t.includes("not available") || t.includes("n/a") || t.includes("none")
  );
}

// -----------------------------
// Parsing Functions
// -----------------------------

function parseClassroomText(text) {
  if (isNotAvailable(text)) {
    return { blocks: 0, classrooms: 0 };
  }

  const lower = normalizeText(text);

  let blocks = 0;
  let classrooms = 0;

  // Extract numeric digits
  const blockMatch = lower.match(/(\d+)\s*blocks?/);
  const classroomMatch = lower.match(/(\d+)\s*classrooms?/);

  if (blockMatch) blocks = parseInt(blockMatch[1]);
  if (classroomMatch) classrooms = parseInt(classroomMatch[1]);

  // Handle words like "three classrooms"
  Object.entries(wordsToNumbers).forEach(([word, num]) => {
    if (lower.includes(word) && lower.includes("classroom")) {
      classrooms = num;
    }
    if (lower.includes(word) && lower.includes("block")) {
      blocks = num;
    }
  });

  // If format like "3 blocks of 3 classrooms"
  if (blocks > 0 && classrooms > 0) {
    return {
      blocks,
      classrooms: blocks * classrooms,
    };
  }

  return {
    blocks,
    classrooms,
  };
}

function parseNumber(text) {
  if (isNotAvailable(text)) return 0;

  const match = text.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

function parseFurniture(text) {
  if (isNotAvailable(text) || normalizeText(text).includes("no")) {
    return 0;
  }

  return parseNumber(text);
}

function yesNo(value) {
  return normalizeText(value) === "yes" ? "yes" : "no";
}

// -----------------------------
// Main Transform Function
// -----------------------------

function transform(doc) {
  const classroomData = parseClassroomText(doc.blocksOfClassroom);
  const primaryData = parseClassroomText(doc.primaryClassroom);

  return {
    // Classroom
    blocksOfClassroom: classroomData.blocks,
    numOfClassrooms: classroomData.classrooms,
    numOfUsedClassrooms: 0, // not available in old schema
    primaryClassrooms: primaryData.classrooms,

    // Toilets (not available in old → default)
    pitToilet: 0,
    waterCloset: 0,
    vipToilet: 0,
    badPitToilet: 0,
    badWaterCloset: 0,
    badVipToilet: 0,
    goodPitToilet: 0,
    goodWaterCloset: 0,
    goodVipToilet: 0,
    mPitToilet: 0,
    mWaterCloset: 0,
    mVipToilet: 0,

    // Facilities
    fence: yesNo(doc.fence),
    agricFarm: yesNo(doc.agricFarm),
    sportFacility: yesNo(doc.sportFacility),

    // Ventilation
    eccdeVentilation: yesNo(doc.eccdeVentilation),
    eccdeVenComment: doc.eccdeVenComment || "",
    primaryVentilation: yesNo(doc.primaryVentilation),
    primaryVenComment: doc.eccdePriComment || "",
    ubeJssVentilation: yesNo(doc.ubeJssVentilation),
    ubeJssVenComment: doc.ubeJssVenComment || "",

    // Furniture
    eccdeChairs: parseFurniture(doc.eccdeFurniture),
    primaryChairs: parseFurniture(doc.primaryFurniture),
    primaryTables: parseFurniture(doc.primaryFurniture),
    ubeJssChairs: parseFurniture(doc.ubeJssFurniture),
    ubeJssTables: parseFurniture(doc.ubeJssFurniture),
    teachersChairs: parseFurniture(doc.teachersFurniture),
    teachersTables: parseFurniture(doc.teachersFurniture),

    // Boards
    blackboard: yesNo(doc.blackboard),
    numOfBlackboards: doc.blackboard === "yes" ? 1 : 0,

    whiteboard: yesNo(doc.whiteboard),
    numOfWhiteboards: 0,

    // Learning materials
    textbook: yesNo(doc.textbook),
    lessonNotes: yesNo(doc.lessonNoyes),
    curriculum: yesNo(doc.curriculum),
    eccdeLearningMaterials: yesNo(doc.eccdeLearningMaterials),

    // Meta
    capturedBy: doc.capturedBy,
    dateCreated: doc.dateCreated,
    school: doc.school,

    // Link to original doc (VERY IMPORTANT)
    sourceId: doc._id,
  };
}

// -----------------------------
// Migration Runner
// -----------------------------

async function migrate() {
  try {
    await mongoose.connect(
      "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0",
    );

    const sourceCollection = mongoose.connection.collection(
      "facilities_unstructured",
    );
    const targetCollection = mongoose.connection.collection(
      "facilities_structured_new",
    );

    const cursor = sourceCollection.find();

    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      const transformed = transform(doc);

      // Prevent duplicates (idempotent)
      await targetCollection.updateOne(
        { sourceId: doc._id },
        { $set: transformed },
        { upsert: true },
      );

      count++;
      if (count % 50 === 0) {
        console.log(`Processed ${count} records...`);
      }
    }

    console.log(`✅ Migration complete. Total: ${count}`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.connection.close();
  }
}

migrate();
