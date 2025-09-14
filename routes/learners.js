import express from "express";
const router = express.Router();
import { Learners } from "../models/learners.js";
import { formatRequestBody } from "../utilities/formatData.js";

router.post(`/`, async (req, res) => {
  try {
    const data = req.body;

    const formattedData = formatRequestBody(data);
    // ✅ Save to MongoDB
    const newLearner = new Learners(formattedData);
    await newLearner.save();

    res.status(201).json({ success: true, data: newLearner });
  } catch (error) {
    console.error("Error saving facility:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
