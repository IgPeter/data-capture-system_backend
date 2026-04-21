import express from "express";
const router = express.Router();
import fs from "fs";
import { SchoolWithLga } from "../models/schoolWithLga.js";
import { Staff } from "../models/staff.js";
import { School } from "../models/school.js";
import { Learners } from "../models/learners.js";
import { Facilities } from "../models/facility.js";
import { SchoolStats } from "../models/SchoolStats.js";
import { authJs } from "../middleware/auth.js";
import { SchoolAlt } from "../models/schoolAlt.js";
import { AddedSchool } from "../models/addedSchool.js";

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

// Schools WITH 2 or more facilities
router.get("/schoolsWithMultipleFacilities", async (req, res) => {
  try {
    // 1. Aggregate to find schools with their facility count
    const facilityCounts = await Facilities.aggregate([
      {
        $group: {
          _id: "$school",
          facilityCount: { $sum: 1 },
        },
      },
      {
        $match: {
          facilityCount: { $gte: 2 }, // 2 or more facilities
        },
      },
    ]);

    const multiFacilitySchoolIds = facilityCounts.map((item) => item._id);

    if (multiFacilitySchoolIds.length === 0) {
      return res.status(404).json({
        message: "No schools found with 2 or more facilities",
      });
    }

    // 2. Fetch the schools
    const schools = await School.find({
      _id: { $in: multiFacilitySchoolIds },
    }).lean();

    // Optional: Add facility count to each school
    const schoolMap = new Map(
      facilityCounts.map((item) => [item._id.toString(), item.facilityCount]),
    );

    const schoolsWithCount = schools.map((school) => ({
      ...school,
      facilityCount: schoolMap.get(school._id.toString()) || 0,
    }));

    // 3. Group by LGA
    const grouped = schoolsWithCount.reduce((acc, school) => {
      const lga = school.lga || "UNKNOWN";
      if (!acc[lga]) acc[lga] = [];
      acc[lga].push(school);
      return acc;
    }, {});

    res.json({
      count: schoolsWithCount.length,
      schools: schoolsWithCount,
      grouped,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

//school without facilities
// GET /schoolsWithoutFacilities
// Schools that have learners but NO facilities at all
// GET /schoolsWithoutFacilities
// Returns all schools that have ZERO facilities
router.get("/schoolsWithoutFacilities", async (req, res) => {
  try {
    // 1. Get all school IDs that have at least one facility
    const facilitySchoolIds = await Facilities.distinct("school");
    const facilitySet = new Set(facilitySchoolIds.map((id) => id.toString()));

    // 2. Get ALL school IDs
    const allSchoolIds = await School.distinct("_id");

    // 3. Filter schools that do NOT have any facilities
    const validSchoolIds = allSchoolIds
      .map((id) => id.toString())
      .filter((id) => !facilitySet.has(id));

    if (validSchoolIds.length === 0) {
      return res.status(404).json({
        message: "No schools found without facilities",
      });
    }

    // 4. Fetch the schools
    const schools = await School.find({
      _id: { $in: validSchoolIds },
    }).lean();

    // 5. Group by LGA (consistent with your other endpoints)
    const grouped = schools.reduce((acc, school) => {
      const lga = school.lga || "UNKNOWN";
      if (!acc[lga]) {
        acc[lga] = [];
      }
      acc[lga].push(school);
      return acc;
    }, {});

    res.json({
      count: schools.length,
      schools,
      grouped,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

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

//GET ALL SCHOOLS
router.get(`/`, authJs, async (req, res) => {
  const schoolList = await School.find();

  if (!schoolList.length > 0) {
    return res.status(404).json({ message: "No school found" });
  }

  res.status(200).json({
    message: "School fetched successfully",
    data: schoolList,
    schoolCount: schoolList.length,
  });
});

//API ROUTE TO GET ALL SCHOOLS WITH ASSOCiATED DATA
router.get(`/withBreakdown`, authJs, async (req, res) => {
  const schoolList = await School.find()
    .populate("staffs")
    .populate("learners")
    .populate("facilities");

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

router.get("/schoolAlt", authJs, async (req, res) => {
  try {
    const schoolAlt = await SchoolAlt.find();

    if (!schoolAlt.length > 0) {
      return res.status(404).json({ message: "No school alt found" });
    }

    res.status(200).json({
      message: "School alt fetched successfully",
      data: schoolAlt,
      schoolAltCount: schoolAlt.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    console.log(error);
  }
});

router.post(`/addSchool`, authJs, async (req, res) => {
  const { data } = req.body;

  const newSchool = new AddedSchool({
    category: data.category,
    type: data.type,
    state: data.state,
    lga: data.lga,
    town: data.town,
    location: data.location,
    level: data.level,
    yearEstablished: data.yearEstablished,
  });

  try {
    const createdSchool = await newSchool.save();
    return res
      .status(201)
      .json({ message: "School created successfully", data: createdSchool });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
