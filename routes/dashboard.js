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

router.get("/stats", async (req, res) => {
  try {
    const stats = await computeDashboardStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      message: "Failed to load dashboard stats",
    });
  }
});

router.get("/bootstrap", async (req, res) => {
  const staffBackedSchools = await Staff.distinct("school");

  const [schools, staffs, learners, facilities] = await Promise.all([
    School.find({ _id: { $in: staffBackedSchools } }).lean(),

    Staff.find({ school: { $in: staffBackedSchools } })
      .populate("school")
      .lean(),

    Learners.find({ school: { $in: staffBackedSchools } })
      .populate("school")
      .lean(),

    Facilities.find({ school: { $in: staffBackedSchools } })
      .populate("school")
      .lean(),
  ]);

  res.json({
    schools,
    staffs,
    learners,
    facilities,
  });
});

export default router;
