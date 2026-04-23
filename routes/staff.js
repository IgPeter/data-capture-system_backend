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
import { authJs } from "../middleware/auth.js";
import { StaffAlt } from "../models/staffAlt.js";

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

//ROUTE TO UPLOAD A STAFF/TEACHER
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

router.get("/updateStaffCategory", authJs, async (req, res) => {
  try {
    const rows = await fetchPayrollMySQLData();

    if (!rows || rows.length === 0) {
      return res.json({
        updated: 0,
        notFound: [],
        message: "No payroll data found",
      });
    }

    console.log(`📦 Processing ${rows.length} payroll records`);

    const staffNotUpdated = [];
    let updatedCount = 0;
    const chunkSize = 500; // Reduced from 1000 — safer for memory
    const BATCH_SIZE = 200; // How many updates per bulkWrite (recommended)

    // Process in smaller batches without loading ALL staff into memory at once
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      const operations = [];

      for (const row of chunk) {
        const staffId = String(row.compno).trim();

        if (!staffId) {
          continue;
        }

        // Check existence using findOne (more memory efficient than preloading everything)
        const exists = await Staff.exists({ staffId: staffId });

        if (!exists) {
          staffNotUpdated.push(staffId);
          continue;
        }

        operations.push({
          updateOne: {
            filter: { staffId },
            update: {
              $set: {
                staffCategory: row.current_designation ?? null,
              },
            },
          },
        });
      }

      // Perform bulkWrite in smaller sub-batches
      if (operations.length > 0) {
        for (let j = 0; j < operations.length; j += BATCH_SIZE) {
          const batch = operations.slice(j, j + BATCH_SIZE);

          const result = await Staff.bulkWrite(batch, {
            ordered: false, // Continue even if some fail
            bypassDocumentValidation: true,
          });

          updatedCount += result.modifiedCount || 0;
        }
      }

      console.log(
        `✅ Processed ${i + chunk.length} / ${rows.length} records | Updated so far: ${updatedCount}`,
      );

      // Optional: Force garbage collection hint
      if (global.gc) global.gc();
    }

    return res.status(200).json({
      updated: updatedCount,
      notFound: staffNotUpdated,
      totalNotFound: staffNotUpdated.length,
      message: `Sync completed successfully.`,
    });
  } catch (error) {
    console.error("❌ Sync error:", error);
    return res.status(500).json({
      message: "Update failed",
      error: error.message,
    });
  }
});

//GET STAFF DATA FROM MYSQL PAYRLL DB
router.get("/staff-payroll", authJs, async (req, res) => {
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

//GET ALL STAFF LIST
router.get("/", authJs, async (req, res) => {
  const schoolId = req.query.school;
  try {
    const staffsList = await Staff.find({ school: schoolId });

    if (!staffsList.length) {
      return res.status(404).json({ message: "No staffs found" });
    }

    return res.status(200).json({
      message: "Staffs data fetched successfully",
      data: staffsList,
      staffsCount: staffsList.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/staffCountPerType", authJs, async (req, res) => {
  try {
    const result = await Staff.aggregate([
      {
        $lookup: {
          from: "schoolstats",
          localField: "school",
          foreignField: "school",
          as: "schoolInfo",
        },
      },
      { $unwind: "$schoolInfo" },
      {
        $group: {
          _id: "$schoolInfo.type",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//EXPORT ALL STAFFS FROM THE MONGO DB PER SCHOOL PER LGA//
router.get("/exportStaffPerSchoolLga", authJs, async (req, res) => {
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
      "attachment; filename=Staff_Per_School_Per_LGA_FINAL.xlsx",
    );

    // 🔹 8️⃣ Send file
    await workbook.xlsx.writeFile(
      "./reports/Staff_Per_School_Per_LGA_FINAL.xlsx",
    );

    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Failed to export staff report" });
  }
});

router.get("/staffAlt", authJs, async (req, res) => {
  try {
    const staffAlt = await StaffAlt.find();

    if (!staffAlt.length > 0) {
      return res.status(404).json({ message: "No staff alt found" });
    }

    res.status(200).json({
      message: "Staff alt fetched successfully",
      data: staffAlt,
      staffAltCount: staffAlt.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    console.log(error);
  }
});

export default router;
