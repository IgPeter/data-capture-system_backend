import express from "express";
import { School } from "../models/school.js";
import { Learners } from "../models/learners.js";
import { Staff } from "../models/staff.js";
import { Facilities } from "../models/facility.js";
import { computeDashboardStats } from "../services/dashboard-stats-service.js";

const router = express.Router();

router.get(`/summary`, async (req, res) => {
  try {
    const schoolCount = await School.countDocuments();
    const learnerCount = await Learners.countDocuments();
    const staffCount = await Staff.countDocuments();
    const facilityCount = await Facilities.countDocuments();

    res.status(200).json({
      message: "Dashboard summary fetched successfully",
      data: {
        schools: schoolCount,
        learners: learnerCount,
        staffs: staffCount,
        facilities: facilityCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    console.log(error);
  }
});

router.get("/all", async (req, res) => {
  try {
    // 1. Get all unique school IDs from staffs
    const schoolIds = await Staff.distinct("school");

    // 2. Fetch everything in parallel using those school IDs
    const [schools, staffs, learners, facilities] = await Promise.all([
      School.find({ _id: { $in: schoolIds } }).lean(),
      Staff.find({ school: { $in: schoolIds } }).lean(),
      Learners.find({ school: { $in: schoolIds } }).lean(),
      Facilities.find({ school: { $in: schoolIds } }).lean(),
    ]);

    // 3. Return structured response
    res.json({
      schools,
      staffs,
      learners,
      facilities,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch associated data",
      error: error.message,
    });
  }
});

router.get("/bootstrap", async (req, res) => {
  try {
    const stats = await Learners.aggregate([
      // 1. Compute totals per document (VERY FAST)
      {
        $project: {
          school: 1,

          eccdeTotal: {
            $add: [
              { $ifNull: ["$eccde.eccde_male", 0] },
              { $ifNull: ["$eccde.eccde_female", 0] },
            ],
          },

          primaryTotal: {
            $add: [
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
            ],
          },

          secondaryTotal: {
            $add: [
              { $ifNull: ["$ubeJss1.jss1_male", 0] },
              { $ifNull: ["$ubeJss1.jss1_female", 0] },

              { $ifNull: ["$ubeJss2.jss2_male", 0] },
              { $ifNull: ["$ubeJss2.jss2_female", 0] },

              { $ifNull: ["$ubeJss3.jss3_male", 0] },
              { $ifNull: ["$ubeJss3.jss3_female", 0] },
            ],
          },

          hasEccde: { $cond: [{ $ifNull: ["$eccde", false] }, 1, 0] },

          hasPrimary: {
            $cond: [
              {
                $or: [
                  { $ifNull: ["$primary1", false] },
                  { $ifNull: ["$primary2", false] },
                  { $ifNull: ["$primary3", false] },
                  { $ifNull: ["$primary4", false] },
                  { $ifNull: ["$primary5", false] },
                  { $ifNull: ["$primary6", false] },
                ],
              },
              1,
              0,
            ],
          },

          hasSecondary: {
            $cond: [
              {
                $or: [
                  { $ifNull: ["$ubeJss1", false] },
                  { $ifNull: ["$ubeJss2", false] },
                  { $ifNull: ["$ubeJss3", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },

      // 2. GROUP BY SCHOOL (this is the BIG speed win)
      {
        $group: {
          _id: "$school",

          eccdeLearners: { $sum: "$eccdeTotal" },
          primaryLearners: { $sum: "$primaryTotal" },
          secondaryLearners: { $sum: "$secondaryTotal" },

          hasEccde: { $max: "$hasEccde" },
          hasPrimary: { $max: "$hasPrimary" },
          hasSecondary: { $max: "$hasSecondary" },
        },
      },

      // 3. Lookup staff count per school (small dataset now)
      {
        $lookup: {
          from: "staffs",
          let: { schoolId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$school", "$$schoolId"] } } },
            { $count: "count" },
          ],
          as: "staffData",
        },
      },

      {
        $addFields: {
          staffCount: {
            $ifNull: [{ $arrayElemAt: ["$staffData.count", 0] }, 0],
          },
        },
      },

      // 4. FINAL TOTALS (VERY SMALL DATASET NOW)
      {
        $group: {
          _id: null,

          totalLearners: {
            $sum: {
              $add: [
                "$eccdeLearners",
                "$primaryLearners",
                "$secondaryLearners",
              ],
            },
          },

          totalEccdeLearners: { $sum: "$eccdeLearners" },
          totalPrimaryLearners: { $sum: "$primaryLearners" },
          totalSecondaryLearners: { $sum: "$secondaryLearners" },

          eccdePrimarySchools: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$hasEccde", 1] },
                    { $eq: ["$hasPrimary", 1] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          primaryOnlySchools: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$hasPrimary", 1] },
                    { $eq: ["$hasEccde", 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          eccdeOnlySchools: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$hasEccde", 1] },
                    { $eq: ["$hasPrimary", 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          secondarySchools: {
            $sum: {
              $cond: [{ $eq: ["$hasSecondary", 1] }, 1, 0],
            },
          },

          totalStaff: { $sum: "$staffCount" },

          staffEccdePrimary: {
            $sum: {
              $cond: [
                {
                  $or: [{ $eq: ["$hasPrimary", 1] }, { $eq: ["$hasEccde", 1] }],
                },
                "$staffCount",
                0,
              ],
            },
          },

          staffSecondary: {
            $sum: {
              $cond: [{ $eq: ["$hasSecondary", 1] }, "$staffCount", 0],
            },
          },
        },
      },
    ]).allowDiskUse(true);

    const [totalSchools, totalFacilities] = await Promise.all([
      School.countDocuments(),
      Facilities.countDocuments(),
    ]);

    res.json({
      schools: {
        total: totalSchools,
        eccdePrimary: stats[0]?.eccdePrimarySchools || 0,
        primaryOnly: stats[0]?.primaryOnlySchools || 0,
        eccdeOnly: stats[0]?.eccdeOnlySchools || 0,
        secondary: stats[0]?.secondarySchools || 0,
      },

      learners: {
        total: stats[0]?.totalLearners || 0,
        eccde: stats[0]?.totalEccdeLearners || 0,
        primary: stats[0]?.totalPrimaryLearners || 0,
        secondary: stats[0]?.totalSecondaryLearners || 0,
      },

      staffs: {
        total: stats[0]?.totalStaff || 0,
        eccdePrimary: stats[0]?.staffEccdePrimary || 0,
        secondary: stats[0]?.staffSecondary || 0,
      },

      facilities: {
        total: totalFacilities,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
