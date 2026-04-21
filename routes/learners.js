import express from "express";
const router = express.Router();
import { Learners } from "../models/learners.js";
import { School } from "../models/school.js";
import { Staff } from "../models/staff.js";
import { initSchoolData, formatLearnerData } from "../utilities/formatData.js";
import ExcelJS from "exceljs";
import { authJs } from "../middleware/auth.js";
//API ROUTE TO ADD LEARNERS
router.post(`/`, async (req, res) => {
  const { data, school } = req.body;

  if (!school || Object.keys(school).length == 0) {
    return res
      .status(403)
      .json({ message: "Cannot upload any data without a school" });
  }

  try {
    const formattedData = formatLearnerData(data);
    console.log("Formatted learner data:", formattedData); // Debug log

    //initializing school data
    const schoolData = await initSchoolData(school);

    // ✅ Save to MongoDB
    const newLearner = new Learners(formattedData);
    newLearner.school = schoolData._id;
    await newLearner.save();

    res.status(201).json({ success: true, data: newLearner });
  } catch (error) {
    console.error("Error saving facility:", error);
    res.status(500).json({ success: false });
  }
});

//GET LEARNER
router.get(`/`, authJs, async (req, res) => {
  const learnersList = await Learners.find();

  if (!learnersList.length) {
    return res.status(404).json({ message: "No learners found" });
  }

  res.status(200).json({
    message: "Learners fetched successfully",
    data: learnersList,
    learnersCount: learnersList.length,
  });
});

//API TO GET ALL WITH MULTIPLE LEARNER DOC LEARNERS
router.get(`/multipleLearnerDoc`, authJs, async (req, res) => {
  const learnersList = await Learners.find();

  if (!learnersList.length) {
    return res.status(404).json({ message: "No learners found" });
  }

  let currentLearnerDocId = "";
  let multipleLearnerSchool = [];

  learnersList.forEach((learnerDoc) => {
    if (
      learnerDoc.school.lga == "VANDEIKYA" &&
      learnerDoc.school._id == currentLearnerDocId
    ) {
      multipleLearnerSchool.push(learnerDoc.school);
    }

    currentLearnerDocId = learnerDoc.school._id;
  });

  res.status(200).json({
    message: "Learners fetched successfully",
    data: learnersList,
    alt: multipleLearnerSchool,
    learnersCount: learnersList.length,
  });
});

//Add authentication middleware to the schools-without-learners route
router.get("/schools-without-learners", authJs, async (req, res) => {
  try {
    const schoolsWithoutLearners = await School.aggregate([
      {
        $lookup: {
          from: "learners", // learners collection
          localField: "_id", // schools._id
          foreignField: "school", // learners.school
          as: "learners",
        },
      },
      {
        $match: {
          learners: { $size: 0 }, // no learners
        },
      },
      {
        $project: {
          learners: 0, // optional: remove learners array
        },
      },
    ]);

    res.json({
      count: schoolsWithoutLearners.length,
      data: schoolsWithoutLearners,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/schools-with-learners", authJs, async (req, res) => {
  try {
    const result = await Learners.aggregate([
      // Group learners by school
      {
        $group: {
          _id: "$school",
          learnerCount: { $sum: 1 },
        },
      },

      // Only schools with 2 or more learners
      {
        $match: {
          learnerCount: { $gte: 2 },
        },
      },

      // Join with schools collection
      {
        $lookup: {
          from: "schools", // collection name in MongoDB
          localField: "_id",
          foreignField: "_id",
          as: "school",
        },
      },

      // Flatten school array
      { $unwind: "$school" },

      // Optional: format response
      {
        $project: {
          _id: 0,
          school: 1,
          learnerCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

//Add authentication middleware to the test route to secure it
router.get("/test", authJs, async (req, res) => {
  try {
    const learners = await Learners.aggregate([
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "school",
        },
      },
      { $unwind: "$school" },

      {
        $match: {
          "school.lga": "VANDEIKYA",
        },
      },

      {
        $group: {
          _id: "$school._id",
          school: { $first: "$school" },
          learners: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },

      {
        $match: {
          count: { $gt: 1 }, // schools with multiple learners
        },
      },
    ]);

    res.status(200).json({
      message: "Learners fetched successfully",
      data: learners,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching learners",
      error: error.message,
    });
  }
});

//Add authentication middleware to the learnerCountPerType route to secure it
router.get("/learnerCountPerType", authJs, async (req, res) => {
  try {
    const result = await Learners.aggregate([
      {
        $lookup: {
          from: "schoolstats",
          localField: "school",
          foreignField: "school",
          as: "schoolInfo",
        },
      },
      { $unwind: "$schoolInfo" },

      // 1. Compute totals per document
      {
        $addFields: {
          totalLearners: {
            $add: [
              // ECCDE
              { $ifNull: ["$eccde.eccde_male", 0] },
              { $ifNull: ["$eccde.eccde_female", 0] },

              // Primary 1–6
              { $ifNull: ["$primary1.pry1_male", 0] },
              { $ifNull: ["$primary1.pry1_female", 0] },
              { $ifNull: ["$primary2.pry2_male", 0] },
              { $ifNull: ["$primary2.pry2_female", 0] },
              { $ifNull: ["$primary3.pry3_male", 0] },
              { $ifNull: ["$primary3.pry3_female", 0] },
              { $ifNull: ["$primary4.pry4_male", 0] },
              { $ifNull: ["$primary4.pry4_female", 0] },
              { $ifNull: ["$primary5.pry5_male", 0] },
              { $ifNull: ["$primary5.pry5_female", 0] },
              { $ifNull: ["$primary6.pry6_male", 0] },
              { $ifNull: ["$primary6.pry6_female", 0] },

              // UBE JSS
              { $ifNull: ["$ubeJss1.jss1_male", 0] },
              { $ifNull: ["$ubeJss1.jss1_female", 0] },
              { $ifNull: ["$ubeJss2.jss2_male", 0] },
              { $ifNull: ["$ubeJss2.jss2_female", 0] },
              { $ifNull: ["$ubeJss3.jss3_male", 0] },
              { $ifNull: ["$ubeJss3.jss3_female", 0] },
            ],
          },
        },
      },

      // 2. Group by type
      {
        $group: {
          _id: "$schoolInfo.type",
          totalLearners: { $sum: "$totalLearners" },
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//API TO EXPORT LEARNERS DATA FOR PRI 1 - UBE JSS 3
router.get("/exportUbec", async (req, res) => {
  try {
    // ---------- HELPERS ----------
    const emptyStats = () => ({
      "PRI. - 1": { M: 0, F: 0 },
      "PRI. - 2": { M: 0, F: 0 },
      "PRI. - 3": { M: 0, F: 0 },
      "PRI. - 4": { M: 0, F: 0 },
      "PRI. - 5": { M: 0, F: 0 },
      "PRI. - 6": { M: 0, F: 0 },
      "UBE. - JSS 1": { M: 0, F: 0 },
      "UBE. - JSS 2": { M: 0, F: 0 },
      "UBE. - JSS 3": { M: 0, F: 0 },
    });

    const NAStats = () => ({
      "PRI. - 1": { M: "NA", F: "NA" },
      "PRI. - 2": { M: "NA", F: "NA" },
      "PRI. - 3": { M: "NA", F: "NA" },
      "PRI. - 4": { M: "NA", F: "NA" },
      "PRI. - 5": { M: "NA", F: "NA" },
      "PRI. - 6": { M: "NA", F: "NA" },
      "UBE. - JSS 1": { M: "NA", F: "NA" },
      "UBE. - JSS 2": { M: "NA", F: "NA" },
      "UBE. - JSS 3": { M: "NA", F: "NA" },
    });

    const classMap = {
      "PRIMARY ONE": "PRI. - 1",
      "PRIMARY TWO": "PRI. - 2",
      "PRIMARY THREE": "PRI. - 3",
      "PRIMARY FOUR": "PRI. - 4",
      "PRIMARY FIVE": "PRI. - 5",
      "PRIMARY SIX": "PRI. - 6",
      "JSS 1": "UBE. - JSS 1",
      "JSS 2": "UBE. - JSS 2",
      "JSS 3": "UBE. - JSS 3",
    };

    const normalizeForExcel = (stats) => {
      const result = {};
      for (const cls in stats) {
        result[cls] = {
          M: stats[cls].M === 0 ? "NA" : stats[cls].M,
          F: stats[cls].F === 0 ? "NA" : stats[cls].F,
        };
      }
      return result;
    };

    // ---------- FETCH DATA ----------

    // 1️⃣ Get schools that have at least one staff
    const staffedSchoolIds = await Staff.distinct("school");

    // 2️⃣ Fetch ONLY schools with staff
    const schools = await School.find({
      _id: { $in: staffedSchoolIds },
    }).lean();

    // 3️⃣ Fetch ONLY learners whose school has staff
    const learners = await Learners.find({
      school: { $in: staffedSchoolIds },
    })
      .populate("school")
      .lean();

    const statsMap = new Map();

    // ---------- PROCESS LEARNERS ----------
    learners.forEach((doc) => {
      if (!doc.school?._id) return;
      const schoolId = String(doc.school._id);

      if (!statsMap.has(schoolId)) {
        statsMap.set(schoolId, emptyStats());
      }

      const stats = statsMap.get(schoolId);

      // ----- TYPE A: aggregated structure -----
      if (doc.primary1 || doc.primary2) {
        if (doc.primary1) {
          stats["PRI. - 1"].M += doc.primary1.pry1_male || 0;
          stats["PRI. - 1"].F += doc.primary1.pry1_female || 0;
        }
        if (doc.primary2) {
          stats["PRI. - 2"].M += doc.primary2.pry2_male || 0;
          stats["PRI. - 2"].F += doc.primary2.pry2_female || 0;
        }

        if (doc.primary3) {
          stats["PRI. - 3"].M += doc.primary3.pry3_male || 0;
          stats["PRI. - 3"].F += doc.primary3.pry3_female || 0;
        }

        if (doc.primary4) {
          stats["PRI. - 4"].M += doc.primary4.pry4_male || 0;
          stats["PRI. - 4"].F += doc.primary4.pry4_female || 0;
        }
        if (doc.primary5) {
          stats["PRI. - 5"].M += doc.primary5.pry5_male || 0;
          stats["PRI. - 5"].F += doc.primary5.pry5_female || 0;
        }
        if (doc.primary6) {
          stats["PRI. - 6"].M += doc.primary6.pry6_male || 0;
          stats["PRI. - 6"].F += doc.primary6.pry6_female || 0;
        }
      }

      if (doc.ubeJss1 || doc.ubeJss2 || doc.ubeJss3) {
        if (doc.ubeJss1) {
          stats["UBE. - JSS 1"].M += doc.ubeJss1.jss1_male || 0;
          stats["UBE. - JSS 1"].F += doc.ubeJss1.jss1_female || 0;
        }

        if (doc.ubeJss2) {
          stats["UBE. - JSS 2"].M += doc.ubeJss2.jss2_male || 0;
          stats["UBE. - JSS 2"].F += doc.ubeJss2.jss2_female || 0;
        }

        if (doc.ubeJss3) {
          stats["UBE. - JSS 3"].M += doc.ubeJss3.jss3_male || 0;
          stats["UBE. - JSS 3"].F += doc.ubeJss3.jss3_female || 0;
        }
      }

      // ----- TYPE B: single learner -----
      if (doc.class && doc.gender) {
        const cls = classMap[doc.class.trim().toUpperCase()];
        if (!cls) return;

        const genderKey = doc.gender.toLowerCase() === "male" ? "M" : "F";
        stats[cls][genderKey] += 1;
      }
    });

    // ---------- GROUP SCHOOLS BY LGA ----------
    const lgaMap = {};
    schools.forEach((s) => {
      if (!lgaMap[s.lga]) lgaMap[s.lga] = [];
      lgaMap[s.lga].push(s);
    });

    // ---------- CREATE EXCEL ----------
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("UBEC REPORT");

    sheet.addRow([
      "LGEA",
      "NAME OF SCHOOL",
      "PRI. - 1",
      "",
      "PRI. - 2",
      "",
      "PRI. - 3",
      "",
      "PRI. - 4",
      "",
      "PRI. - 5",
      "",
      "PRI. - 6",
      "",
      "UBE. - JSS 1",
      "",
      "UBE. - JSS 2",
      "",
      "UBE. - JSS 3",
      "",
    ]);

    sheet.addRow([
      "",
      "",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
      "M",
      "F",
    ]);

    for (const lga in lgaMap) {
      let firstRow = true;

      for (const school of lgaMap[lga]) {
        const rawStats = statsMap.get(String(school._id));
        const stats = rawStats ? normalizeForExcel(rawStats) : NAStats();

        sheet.addRow([
          firstRow ? lga : "",
          school.name,

          stats["PRI. - 1"].M,
          stats["PRI. - 1"].F,
          stats["PRI. - 2"].M,
          stats["PRI. - 2"].F,
          stats["PRI. - 3"].M,
          stats["PRI. - 3"].F,
          stats["PRI. - 4"].M,
          stats["PRI. - 4"].F,
          stats["PRI. - 5"].M,
          stats["PRI. - 5"].F,
          stats["PRI. - 6"].M,
          stats["PRI. - 6"].F,
          stats["UBE. - JSS 1"] ? stats["UBE. - JSS 1"].M : "NA",
          stats["UBE. - JSS 1"] ? stats["UBE. - JSS 1"].F : "NA",
          stats["UBE. - JSS 2"] ? stats["UBE. - JSS 2"].M : "NA",
          stats["UBE. - JSS 2"] ? stats["UBE. - JSS 2"].F : "NA",
          stats["UBE. - JSS 3"] ? stats["UBE. - JSS 3"].M : "NA",
          stats["UBE. - JSS 3"] ? stats["UBE. - JSS 3"].F : "NA",
        ]);

        firstRow = false;
      }
    }

    // ---------- RESPONSE ----------
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=UBEC-Report.xlsx",
    );

    //await workbook.xlsx.write(res);
    await workbook.xlsx.writeFile("reports/Latest-Learners-Report_FINAL.xlsx");
    res.download("reports/Latest-Learners-Report_FINAL.xlsx");
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to export report" });
  }
});
//Ended export ubec data

//eccde export
router.get("/exportUbecEccde", async (req, res) => {
  try {
    // ---------- HELPERS ----------
    const emptyStats = () => ({
      ECCDE: { M: 0, F: 0 },
    });

    const NAStats = () => ({
      ECCDE: { M: "NA", F: "NA" },
    });

    // ---------- FETCH DATA ----------

    // 1️⃣ Schools that have staff
    const staffedSchoolIds = await Staff.distinct("school");

    // 2️⃣ Fetch those schools
    const schools = await School.find({
      _id: { $in: staffedSchoolIds },
    }).lean();

    // 3️⃣ Fetch learners that contain ECCDE
    const learners = await Learners.find({
      school: { $in: staffedSchoolIds },
      eccde: { $exists: true, $ne: null },
    })
      .populate("school")
      .lean();

    const statsMap = new Map();

    // ---------- PROCESS LEARNERS ----------
    learners.forEach((doc) => {
      if (!doc.school?._id) return;

      const schoolId = String(doc.school._id);

      if (!statsMap.has(schoolId)) {
        statsMap.set(schoolId, emptyStats());
      }

      const stats = statsMap.get(schoolId);

      if (doc.eccde) {
        stats.ECCDE.M += doc.eccde.eccde_male || 0;
        stats.ECCDE.F += doc.eccde.eccde_female || 0;
      }
    });

    // ---------- GROUP SCHOOLS BY LGA ----------
    const lgaMap = {};

    schools.forEach((s) => {
      if (!lgaMap[s.lga]) lgaMap[s.lga] = [];
      lgaMap[s.lga].push(s);
    });

    // ---------- CREATE EXCEL ----------
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("UBEC ECCDE REPORT");

    sheet.addRow(["LGEA", "NAME OF SCHOOL", "ECCDE M", "ECCDE F"]);

    for (const lga in lgaMap) {
      let firstRow = true;

      for (const school of lgaMap[lga]) {
        const stats = statsMap.get(String(school._id)) || NAStats();

        sheet.addRow([
          firstRow ? lga : "",
          school.name,
          stats.ECCDE.M,
          stats.ECCDE.F,
        ]);

        firstRow = false;
      }
    }

    // ---------- RESPONSE ----------
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=UBEC-ECCDE-Report.xlsx",
    );

    await workbook.xlsx.writeFile("reports/ECCDE-Report-FINAL.xlsx");

    res.download("reports/ECCDE-Report-FINAL`.xlsx");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to export report" });
  }
});

//--------------------//

router.get("/learnersByLga", async (req, res) => {
  const learnersByLga = await Learners.aggregate([
    {
      $lookup: {
        from: "schoolsAndLga", // collection name
        localField: "school",
        foreignField: "_id",
        as: "schoolLga",
      },
    },
    { $unwind: "$schoolLga" },

    {
      $group: {
        _id: "$schoolLga.lga",
        learnersCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        lga: "$_id",
        learnersCount: 1,
      },
    },
  ]);

  if (!learnersByLga.length) {
    return res.status(404).json({ message: "No learners found" });
  }

  res.status(200).json({
    message: "Learners per LGA fetched successfully",
    data: learnersByLga,
  });
});

router.get("/learnersAndCountPerSchoolLga", async (req, res) => {
  const result = await Learners.aggregate([
    // 1️⃣ Join school
    {
      $lookup: {
        from: "schools",
        localField: "school",
        foreignField: "_id",
        as: "school",
      },
    },
    { $unwind: "$school" },

    // 2️⃣ Convert nested class objects into an array
    {
      $addFields: {
        classObjects: [
          "$primary1",
          "$primary2",
          "$primary3",
          "$primary4",
          "$primary5",
          "$primary6",
        ],
      },
    },

    // 3️⃣ Calculate learnersCount per document
    {
      $addFields: {
        learnersCount: {
          $cond: [
            { $ifNull: ["$fullName", false] },
            1,
            {
              $reduce: {
                input: "$classObjects",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $ifNull: ["$$this", false] },
                        {
                          $add: [
                            { $ifNull: ["$$this.pry1_male", 0] },
                            { $ifNull: ["$$this.pry1_female", 0] },
                            { $ifNull: ["$$this.pry2_male", 0] },
                            { $ifNull: ["$$this.pry2_female", 0] },
                            { $ifNull: ["$$this.pry3_male", 0] },
                            { $ifNull: ["$$this.pry3_female", 0] },
                            { $ifNull: ["$$this.pry4_male", 0] },
                            { $ifNull: ["$$this.pry4_female", 0] },
                            { $ifNull: ["$$this.pry5_male", 0] },
                            { $ifNull: ["$$this.pry5_female", 0] },
                            { $ifNull: ["$$this.pry6_male", 0] },
                            { $ifNull: ["$$this.pry6_female", 0] },
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },

    // 4️⃣ Group per school
    {
      $group: {
        _id: "$school._id",
        schoolName: { $first: "$school.name" },
        lga: { $first: "$school.lga" },
        totalLearnersInSchool: { $sum: "$learnersCount" },
      },
    },

    // 5️⃣ Group per LGA
    {
      $group: {
        _id: "$lga",
        totalLearnersInLga: { $sum: "$totalLearnersInSchool" },
        schools: {
          $push: {
            schoolId: "$_id",
            schoolName: "$schoolName",
            learnersCount: "$totalLearnersInSchool",
          },
        },
      },
    },

    // 6️⃣ Shape response
    {
      $project: {
        _id: 0,
        lga: "$_id",
        totalLearnersInLga: 1,
        schools: 1,
      },
    },
  ]);

  if (!result.length) {
    return res.status(404).json({ message: "No learners found" });
  }

  res.status(200).json({
    message: "Learners summary fetched successfully",
    data: result,
  });
});

// Endpoint for enrollment per LGA (male/female)
router.get("/enrollment-per-lga", async (req, res) => {
  try {
    const enrollmentPerLga = await Learners.aggregate([
      // Project total males and females per learner document
      {
        $project: {
          school: 1,
          totalMales: {
            $add: [
              "$eccde.eccde_male",
              "$primary1.pry1_male",
              "$primary2.pry2_male",
              "$primary3.pry3_male",
              "$primary4.pry4_male",
              "$primary5.pry5_male",
              "$primary6.pry6_male",
            ],
          },
          totalFemales: {
            $add: [
              "$eccde.eccde_female",
              "$primary1.pry1_female",
              "$primary2.pry2_female",
              "$primary3.pry3_female",
              "$primary4.pry4_female",
              "$primary5.pry5_female",
              "$primary6.pry6_female",
            ],
          },
        },
      },
      // Lookup school to get LGA
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "schoolInfo",
        },
      },
      { $unwind: "$schoolInfo" },
      // Group by LGA, sum males and females
      {
        $group: {
          _id: "$schoolInfo.lga",
          totalMales: { $sum: "$totalMales" },
          totalFemales: { $sum: "$totalFemales" },
        },
      },
      { $sort: { totalMales: -1, totalFemales: -1 } }, // Sort descending, adjust as needed
    ]);

    res.json(
      enrollmentPerLga.map((group) => ({
        lga: group._id,
        totalMales: group.totalMales,
        totalFemales: group.totalFemales,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
