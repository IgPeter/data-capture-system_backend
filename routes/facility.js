import express from "express";
const router = express.Router();
import { Facilities } from "../models/facility.js";
import { formatRequestBody } from "../utilities/formatData.js";

router.post(`/`, async (req, res) => {
  try {
    // req.body contains form data
    const data = req.body;

    const formattedData = formatRequestBody(data);
    // ✅ Save to MongoDB
    const newFacility = new Facilities(formattedData);
    const response = await newFacility.save();

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error saving facility:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
