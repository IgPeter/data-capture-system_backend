import mongoose from "mongoose";

async function run() {
  await mongoose.connect(
    "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0",
  );

  const db = mongoose.connection.db;

  const schoolsCol = db.collection("schoolsBackup");
  const facilitiesCol = db.collection("facilities_update");
  const staffsCol = db.collection("staffs");

  // Load all data
  const schools = await schoolsCol.find({}).toArray();
  const staffs = await staffsCol.find({}).toArray();

  // ALL existing facilities
  const allFacilities = await facilitiesCol.find({}).toArray();

  // Valid donor facilities only
  const donors = allFacilities.filter(
    (f) => typeof f.blocksOfClassroom === "number",
  );

  // Maps
  const schoolMap = new Map(schools.map((s) => [String(s._id), s]));
  const staffMap = new Map(staffs.map((s) => [String(s.school), s]));

  // Schools that already have facilities
  const facilitySchoolIds = new Set(allFacilities.map((f) => String(f.school)));

  // Missing schools only
  const missingSchools = schools.filter(
    (s) => !facilitySchoolIds.has(String(s._id)),
  );

  console.log("Missing:", missingSchools.length);

  // Group donors by facility creation date month
  const donorByMonth = {};

  for (const donor of donors) {
    if (!donor.dateCreated) continue;

    const d = new Date(donor.dateCreated);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;

    if (!donorByMonth[key]) donorByMonth[key] = [];

    donorByMonth[key].push(donor);
  }

  let inserted = 0;

  for (const school of missingSchools) {
    const staff = staffMap.get(String(school._id));

    let pool = [];

    // Try matching by staff.dateCreated month
    if (staff?.dateCreated) {
      const d = new Date(staff.dateCreated);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;

      pool = donorByMonth[key] || [];
    }

    // If no match, random donor
    if (pool.length === 0) {
      pool = donors;
    }

    const donor = pool[Math.floor(Math.random() * pool.length)];

    const clone = { ...donor };

    delete clone._id;

    clone.school = school._id;
    clone.generated = true;
    clone.dateCreated = new Date();
    clone.clonedFrom = donor._id;

    await facilitiesCol.insertOne(clone);

    inserted++;

    console.log(`${inserted}/${missingSchools.length} ${school.name}`);
  }

  console.log("DONE:", inserted);

  await mongoose.disconnect();
}

run();
