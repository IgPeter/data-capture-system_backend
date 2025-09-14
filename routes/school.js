import express from "express";
const router = express.Router();
import fs from "fs";
import { getUniqueLga } from "../utilities/formatData.js";
router.get(`/by-lga`, async (req, res) => {
  const { lgaValue } = req.query;
  try {
    fs.readFile("./teachers.json", (err, data) => {
      if (err) {
        return res.status(500).json({ message: "Error reading file" });
      }
      const staffs = JSON.parse(data);
      const staffData = staffs.map((data) =>
        data.lga == lgaValue ? data : null
      );

      const schools = staffData
        .filter((staff) => staff && staff.school) // only keep staff that has a school
        .map((staff) => staff.school.trim());

      const uniqueSchools = getUniqueLga(schools);

      const result = uniqueSchools.map((school_name, index) => ({
        school_id: index + 1,
        school_name,
      }));

      res.status(200).json({ messsage: "Successful", result });
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
});

export default router;
