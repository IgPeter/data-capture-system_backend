import express from "express";
const router = express.Router();
import fs from "fs";
import { SchoolWithLga } from "../models/schoolWithLga.js";

import { getUniqueLga, fetchSchoolMysqlData } from "../utilities/formatData.js";

router.get(`/by-lga`, async (req, res) => {
  const { lgaValue } = req.query;

  try {
    fs.readFile("./schools.json", (err, data) => {
      if (err) {
        return res.status(500).json({ message: "Error reading file" });
      }
      const schoolData = JSON.parse(data);

      const finalSchoolData = schoolData.map((data) =>
        data.LGEA == lgaValue ? data : null
      );

      const schools = finalSchoolData
        .filter((school) => school && school.SCHOOL_NAME) // only keep staff that has a school
        .map((school) => school.SCHOOL_NAME.trim());

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

router.get(`/schoolsWithLga`, async (req, res) => {
  try {
    const schoolsList = await fetchSchoolMysqlData();

    if (!schoolsList || schoolsList.length === 0) {
      return res.status(404).json({ message: "No school found" });
    }

    schoolsList.forEach((school) => {
      if (
        school.ADDRESS == "" ||
        school.ADDRESS == undefined ||
        school.SCHOOL_NAME == "" ||
        school.SCHOOL_NAME == undefined ||
        school.LGEA == "" ||
        school.LGEA == undefined
      ) {
        console.log("Incomplete data found, skipping entry:", school);
      }
    });

    const schoolsToInsert = schoolsList.map((schoolData) => {
      return new SchoolWithLga({
        name: schoolData.SCHOOL_NAME,
        lga: schoolData.LGEA,
        address: schoolData.ADDRESS,
      });
    });

    await SchoolWithLga.insertMany(schoolsToInsert, {
      ordered: false,
    });

    res
      .status(200)
      .json({ message: "School Data fetched and SchoolWithLga created" });
  } catch (error) {
    console.error("Error fetching school data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
