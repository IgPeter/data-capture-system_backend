import express from "express";
const router = express.Router();
import { Learners } from "../models/learners.js";
import { initSchoolData, formatLearnerData } from "../utilities/formatData.js";

router.post(`/`, async (req, res) => {
  try {
    const data = req.body;
    const { school } = req.query;

    if (school === undefined || school.trim() === "") {
      return res
        .status(403)
        .json({ message: "Cannot upload any data without a school" });
    }

    const formattedData = formatLearnerData(data);

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

export default router;
