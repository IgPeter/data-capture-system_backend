import express from "express";
const router = express.Router();
import { Staff } from "../models/staff.js";
import { connectMongo } from "../database/db.js";
import {
  formatRequestBody,
  initSchoolData,
  fetchPayrollMySQLData,
} from "../utilities/formatData.js";
import multer from "multer";
import mongoose from "mongoose";

const fileExtension = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

//configuring multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/upload");
  },

  filename: function (req, file, cb) {
    const fileName = file.originalname.replace(" ", "-");
    const extension = fileExtension[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const upload = multer({ storage: storage });

router.post(`/`, upload.single("avatar"), async (req, res) => {
  const { school } = req.query;

  if (mongoose.connection.readyState !== 1) {
    // connect DB + start server
    await connectMongo().catch((err) => {
      console.error("Mongo connection failed:", err);
      // optionally exit process if DB is critical
    });
  }

  if (school === undefined || school.trim() === "") {
    return res
      .status(403)
      .json({ message: "Cannot upload any data without a school" });
  }

  try {
    const data = req.body;
    const avatar = req.file;

    const fileName = req.file.filename;
    const filePath = `http://${req.get("host")}/public/upload`;

    if (!avatar) {
      res.status(400).json({ message: "Picure upload is neccessary" });
    }

    data.avatar = `${filePath}/${fileName}`;

    const formattedData = formatRequestBody(data);

    //initializing school data
    const schoolData = await initSchoolData(school);

    // ✅ Save to MongoDB
    const newStaff = new Staff(formattedData);
    newStaff.school = schoolData._id;
    await newStaff.save();

    res.status(201).json({ success: true, data: newStaff });
  } catch (error) {
    console.error("Error saving staff:", error);
    res.status(500).json({ success: false });
  }
});

router.get("/staff-payroll", async (req, res) => {
  try {
    const payrollData = await fetchPayrollMySQLData();

    res
      .status(200)
      .json({ message: "Payroll Data fetched", data: payrollData });
  } catch (error) {
    console.error("Error fetching payroll data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get(`/`, async (req, res) => {
  try {
    const staffList = await Staff.find();

    if (!staffList.length > 0) {
      return res.status(404).json({ message: "No staff found" });
    }

    res
      .status(200)
      .json({ message: "Staff fetched successfully", data: staffList });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    console.log(error);
  }
});

export default router;
