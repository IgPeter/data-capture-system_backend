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
import ExcelJS from "exceljs";

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
  const school = JSON.parse(req.body.schoolData);

  if (mongoose.connection.readyState !== 1) {
    // connect DB + start server
    await connectMongo().catch((err) => {
      console.error("Mongo connection failed:", err);
      // optionally exit process if DB is critical
    });
  }

  if (!school || Object.keys(school).length == 0) {
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

router.get("/", async (req, res) => {
  const { lga } = req.query;

  try {
    const staffsList = await Staff.find().populate("school");

    if (!staffsList.length) {
      return res.status(404).json({ message: "No staffs found" });
    }

    // ✅ If no LGA → return full list
    if (!lga || lga === "All Lgas") {
      return res.status(200).json({
        message: "Staffs data fetched successfully",
        data: staffsList,
        staffsCount: staffsList.length,
      });
    }

    // ✅ Filter by LGA
    const staffsByLga = staffsList.filter(
      (staff) => staff?.school?.lga === lga,
    );

    return res.status(200).json({
      message: "Staffs data by LGA fetched successfully",
      data: staffsByLga,
      staffsCount: staffsByLga.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/exportStaffPerSchoolLga", async (req, res) => {
  try {
    // 🔹 1️⃣ Aggregate staff data
    const result = await Staff.aggregate([
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "school",
        },
      },
      { $unwind: "$school" },

      {
        $group: {
          _id: "$school._id",
          schoolName: { $first: "$school.name" },
          lga: { $first: "$school.lga" },

          totalMale: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: "$gender" }, "male"] }, 1, 0],
            },
          },

          totalFemale: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: "$gender" }, "female"] }, 1, 0],
            },
          },

          totalStaff: { $sum: 1 },
        },
      },

      {
        $group: {
          _id: "$lga",
          totalMaleInLga: { $sum: "$totalMale" },
          totalFemaleInLga: { $sum: "$totalFemale" },
          totalStaffInLga: { $sum: "$totalStaff" },
          schools: {
            $push: {
              schoolName: "$schoolName",
              totalMale: "$totalMale",
              totalFemale: "$totalFemale",
              totalStaff: "$totalStaff",
            },
          },
        },
      },

      { $sort: { _id: 1 } },
    ]);

    if (!result.length) {
      return res.status(404).json({ message: "No staff found" });
    }

    // 🔹 2️⃣ Create Excel Workbook
    const workbook = new ExcelJS.Workbook();

    // 🔹 3️⃣ Loop through LGAs → create sheet per LGA
    result.forEach((lgaData) => {
      const worksheet = workbook.addWorksheet(lgaData._id);

      // Columns
      worksheet.columns = [
        { header: "School Name", key: "schoolName", width: 30 },
        { header: "Male Staff", key: "totalMale", width: 15 },
        { header: "Female Staff", key: "totalFemale", width: 15 },
        { header: "Total Staff", key: "totalStaff", width: 15 },
      ];

      // Add School Rows
      lgaData.schools.forEach((school) => {
        worksheet.addRow(school);
      });

      // 🔹 4️⃣ Add Total Row
      worksheet.addRow({});
      worksheet.addRow({
        schoolName: "TOTAL",
        totalMale: lgaData.totalMaleInLga,
        totalFemale: lgaData.totalFemaleInLga,
        totalStaff: lgaData.totalStaffInLga,
      });

      // 🔹 5️⃣ Style Header Row
      worksheet.getRow(1).font = { bold: true };

      // 🔹 6️⃣ Style Total Row
      const totalRowNumber = worksheet.lastRow.number;
      worksheet.getRow(totalRowNumber).font = { bold: true };
    });

    // 🔹 7️⃣ Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Staff_Per_School_Per_LGA.xlsx",
    );

    // 🔹 8️⃣ Send file
    await workbook.xlsx.writeFile("./reports/Staff_Per_School_Per_LGA.xlsx");
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Failed to export staff report" });
  }
});

export default router;
