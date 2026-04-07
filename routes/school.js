import express from "express";
const router = express.Router();
import fs from "fs";
import { SchoolWithLga } from "../models/schoolWithLga.js";
import { Staff } from "../models/staff.js";
import { School } from "../models/school.js";
import { Learners } from "../models/learners.js";
import { Facilities } from "../models/facility.js";
import { SchoolStats } from "../models/SchoolStats.js";

import { getUniqueLga, fetchSchoolMysqlData } from "../utilities/formatData.js";

//GET ALL SCHOOLS BY LGA
router.get(`/by-lga`, async (req, res) => {
  const { lgaValue } = req.query;

  try {
    fs.readFile("./schools.json", (err, data) => {
      if (err) {
        return res.status(500).json({ message: "Error reading file" });
      }

      const schoolData = JSON.parse(data);

      const finalSchoolData = schoolData.map((data) =>
        data.LGEA == lgaValue ? data : null,
      );

      const schools = finalSchoolData
        .filter((school) => school && school.SCHOOL_NAME) // keep actual schools
        .map((school) => school);

      //const schoolNames = schools.map((school) => school.SCHOOL_NAME.trim());

      //const uniqueSchools = getUniqueLga(schoolNames);

      /*const result = uniqueSchools.map((school_name, index) => ({
        school_id: index + 1,
        school_name,
      }));*/

      res.status(200).json({ messsage: "Successful", schools });
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
});

//RETURN ALL SCHOOLS FROM MYSQL
router.get(`/schoolsWithLga`, async (req, res) => {
  try {
    const schoolsList = await fetchSchoolMysqlData();

    if (!schoolsList || schoolsList.length === 0) {
      return res.status(404).json({ message: "No school found" });
    }

    const schoolsToInsert = [];

    schoolsList.forEach((school) => {
      // 🧹 Trim all string fields safely
      const name = school.SCHOOL_NAME?.trim();
      const lga = school.LGEA?.trim();
      const address = school.ADDRESS?.trim();

      // ❌ Skip incomplete or empty-after-trim data
      if (!name || !lga || !address) {
        console.log("Incomplete data found, skipping entry:", school);
        return;
      }

      schoolsToInsert.push(
        new SchoolWithLga({
          name,
          lga,
          address,
        }),
      );
    });

    if (schoolsToInsert.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid school records to insert" });
    }

    await SchoolWithLga.insertMany(schoolsToInsert, {
      ordered: false, // continues even if some fail
    });

    res.status(200).json({
      message: "School Data fetched and SchoolWithLga created",
      inserted: schoolsToInsert.length,
    });
  } catch (error) {
    console.error("Error fetching school data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/schoolsWithoutStaffs", async (req, res) => {
  try {
    // 1. Get all school IDs that have staffs
    const schoolIdsWithStaffs = await Staff.distinct("school");

    // 2. Find schools NOT in that list
    const schoolsWithoutStaffs = await School.find({
      _id: { $nin: schoolIdsWithStaffs },
    }).lean();

    // 3. Handle empty result
    if (!schoolsWithoutStaffs.length) {
      return res.status(404).json({
        message: "No schools without staffs found",
      });
    }

    // 4. Return result
    res.json({
      count: schoolsWithoutStaffs.length,
      schools: schoolsWithoutStaffs,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

//LEARNER ONLY
router.get("/schoolsWithLearnersOnly", async (req, res) => {
  try {
    // 1. Get school IDs
    const staffSchoolIds = await Staff.distinct("school");
    const facilitySchoolIds = await Facilities.distinct("school");
    const learnerSchoolIds = await Learners.distinct("school");

    // 2. Convert to sets
    const staffSet = new Set(staffSchoolIds.map((id) => id.toString()));
    const facilitySet = new Set(facilitySchoolIds.map((id) => id.toString()));

    // 3. Filter valid school IDs
    const validSchoolIds = learnerSchoolIds
      .map((id) => id.toString())
      .filter((id) => !staffSet.has(id) && !facilitySet.has(id));

    // 4. Fetch schools
    const schools = await School.find({
      _id: { $in: validSchoolIds },
    }).lean();

    if (!schools.length) {
      return res.status(404).json({
        message:
          "No schools found with learners only (no staffs, no facilities)",
      });
    }

    // 5. Group by LGA
    const grouped = schools.reduce((acc, school) => {
      const lga = school.lga || "UNKNOWN";

      if (!acc[lga]) {
        acc[lga] = [];
      }

      acc[lga].push(school);
      return acc;
    }, {});

    // 6. Return grouped result
    res.json({
      count: schools.length,
      grouped,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

//END LEARNER ONLY

router.get("/schoolsWithoutStaffsAndLearners", async (req, res) => {
  try {
    // 1. Get school IDs that have staffs or learners
    const staffSchoolIds = await Staff.distinct("school");
    const learnerSchoolIds = await Learners.distinct("school");

    // 2. Combine both into one unique set
    const usedSchoolIds = [
      ...new Set([
        ...staffSchoolIds.map((id) => id.toString()),
        ...learnerSchoolIds.map((id) => id.toString()),
      ]),
    ];

    // 3. Find schools NOT in that list
    const schools = await School.find({
      _id: { $nin: usedSchoolIds },
    }).lean();

    // 4. Handle empty result
    if (!schools.length) {
      return res.status(404).json({
        message: "No schools without staffs and learners found",
      });
    }

    // 5. Return result
    res.json({
      count: schools.length,
      schools,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

//GETTING SCHOOL LEARNERS DATA
router.get("/schoolLearnersData", async (req, res) => {
  try {
    // 1. Get schools with staffs
    const schoolIds = await Staff.distinct("school");

    // 2. Get learners for those schools
    const learners = await Learners.find({
      school: { $in: schoolIds },
    }).lean();

    // 3. Classify schools
    const schoolMap = {};

    learners.forEach((doc) => {
      const schoolId = doc.school.toString();

      const hasEccde = !!doc.eccde;

      const hasPrimary =
        doc.primary1 ||
        doc.primary2 ||
        doc.primary3 ||
        doc.primary4 ||
        doc.primary5 ||
        doc.primary6;

      const hasSecondary = doc.ubeJss1 || doc.ubeJss2 || doc.ubeJss3;

      let type = null;

      if (hasSecondary) {
        type = "secondary";
      } else if (hasEccde && hasPrimary) {
        type = "eccde_primary";
      } else if (hasEccde && !hasPrimary) {
        type = "eccde_only";
      } else if (!hasEccde && hasPrimary) {
        type = "primary_only";
      }

      schoolMap[schoolId] = type;
    });

    // 4. Convert to array for DB
    const statsToSave = Object.entries(schoolMap).map(([school, type]) => ({
      school,
      type,
    }));

    // 5. Save (UPSERT to avoid duplicates)
    await SchoolStats.bulkWrite(
      statsToSave.map((item) => ({
        updateOne: {
          filter: { school: item.school },
          update: { $set: item },
          upsert: true,
        },
      })),
    );

    res.json({
      message: "School classification computed and stored",
      count: statsToSave.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

//API ROUTE TO GET ALL SCHOOLS
router.get(`/`, async (req, res) => {
  const schoolList = await School.find()
    .populate({ path: "staffs", select: "_id staffId, schoolCategory" })
    .populate({ path: "learners", select: "_id eccde primary1 school" })
    .populate({
      path: "facilities",
      select: "_id school toilet toiletComment",
    });

  if (!schoolList.length > 0) {
    return res.status(404).json({ message: "No school found" });
  }

  res.status(200).json({
    message: "School fetched successfully",
    data: schoolList,
    schoolCount: schoolList.length,
  });
});

//MONGO AGGREGATE ROUTE TO GET SCHOOL PER LGA
router.get("/per-lga", async (req, res) => {
  try {
    const schoolsPerLga = await School.aggregate([
      { $group: { _id: "$lga", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, // Sort descending by count, like in your image
    ]);

    res.json(
      schoolsPerLga.map((group) => ({ lga: group._id, count: group.count })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
