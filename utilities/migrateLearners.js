import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

function getClassGroup(cls) {
  cls = normalize(cls);

  if (cls.includes("eccde")) return "eccde";

  if (cls.includes("primary 1")) return "primary1";
  if (cls.includes("primary 2")) return "primary2";
  if (cls.includes("primary 3")) return "primary3";
  if (cls.includes("primary 4")) return "primary4";
  if (cls.includes("primary 5")) return "primary5";
  if (cls.includes("primary 6")) return "primary6";

  if (cls.includes("jss 1")) return "jss1";
  if (cls.includes("jss 2")) return "jss2";
  if (cls.includes("jss 3")) return "jss3";

  return null;
}

function isSecondaryClass(group) {
  return ["jss1", "jss2", "jss3"].includes(group);
}

// -----------------------------

function initPrimary() {
  return {
    eccde: { eccde_male: 0, eccde_female: 0 },
    primary1: { pry1_male: 0, pry1_female: 0 },
    primary2: { pry2_male: 0, pry2_female: 0 },
    primary3: { pry3_male: 0, pry3_female: 0 },
    primary4: { pry4_male: 0, pry4_female: 0 },
    primary5: { pry5_male: 0, pry5_female: 0 },
    primary6: { pry6_male: 0, pry6_female: 0 },
  };
}

function initSecondary() {
  return {
    ubeJss1: { jss1_male: 0, jss1_female: 0 },
    ubeJss2: { jss2_male: 0, jss2_female: 0 },
    ubeJss3: { jss3_male: 0, jss3_female: 0 },
  };
}

// -----------------------------

function applyPrimary(data, group, gender) {
  if (group === "eccde") data.eccde[`eccde_${gender}`]++;
  if (group === "primary1") data.primary1[`pry1_${gender}`]++;
  if (group === "primary2") data.primary2[`pry2_${gender}`]++;
  if (group === "primary3") data.primary3[`pry3_${gender}`]++;
  if (group === "primary4") data.primary4[`pry4_${gender}`]++;
  if (group === "primary5") data.primary5[`pry5_${gender}`]++;
  if (group === "primary6") data.primary6[`pry6_${gender}`]++;
}

function applySecondary(data, group, gender) {
  if (group === "jss1") data.ubeJss1[`jss1_${gender}`]++;
  if (group === "jss2") data.ubeJss2[`jss2_${gender}`]++;
  if (group === "jss3") data.ubeJss3[`jss3_${gender}`]++;
}

// -----------------------------

async function migrate() {
  try {
    await client.connect();
    const db = client.db("subebe_capture");

    const learnersCol = db.collection("learnersBackup");
    const schoolsCol = db.collection("schoolsBackup");
    const targetCol = db.collection("learners_structured");

    const schoolMap = new Map();

    const cursor = learnersCol.find();

    while (await cursor.hasNext()) {
      const student = await cursor.next();

      // 🔥 CRITICAL: verify school exists
      const schoolDoc = await schoolsCol.findOne({
        _id: student.school,
      });

      if (!schoolDoc) {
        console.log("❌ Missing school for learner:", student._id);
        continue;
      }

      const schoolId = schoolDoc._id.toString();

      if (!schoolMap.has(schoolId)) {
        schoolMap.set(schoolId, {
          school: schoolDoc._id,
          primary: initPrimary(),
          secondary: initSecondary(),
        });
      }

      const schoolObj = schoolMap.get(schoolId);

      const group = getClassGroup(student.class);
      if (!group) continue;

      const gender = normalize(student.gender) === "male" ? "male" : "female";

      if (isSecondaryClass(group)) {
        applySecondary(schoolObj.secondary, group, gender);
      } else {
        applyPrimary(schoolObj.primary, group, gender);
      }
    }

    // -----------------------------
    // SAVE
    // -----------------------------

    for (const value of schoolMap.values()) {
      const hasSecondary =
        value.secondary.ubeJss1.jss1_male +
          value.secondary.ubeJss1.jss1_female +
          value.secondary.ubeJss2.jss2_male +
          value.secondary.ubeJss2.jss2_female +
          value.secondary.ubeJss3.jss3_male +
          value.secondary.ubeJss3.jss3_female >
        0;

      const doc = {
        ...(hasSecondary ? value.secondary : value.primary),
        school: value.school,
        capturedBy: "migration-script",
        dateCreated: new Date(),
      };

      await targetCol.updateOne(
        { school: value.school },
        { $set: doc },
        { upsert: true },
      );
    }

    console.log("✅ Migration complete");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

migrate();
