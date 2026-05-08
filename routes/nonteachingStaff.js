import express from "express";
import { NonTeachingStaff } from "../models/NonTeachingStaff.js";
import { authJs } from "../middleware/auth.js";
import multer from "multer";
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

//GET NON TEACHING STAFFS
router.get(`/`, authJs, async (req, res) => {
  try {
    const nonteachingstaffList = await NonTeachingStaff.find();

    if (!nonteachingstaffList.length > 0) {
      res.status(404).json({ message: "Non Teaching Staff Not Found" });
    }

    return res.status(200).json({
      message: "Staffs data fetched successfully",
      data: nonteachingstaffList,
      staffsCount: nonteachingstaffList.length,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /nonteachingStaff - Create new non-teaching staff member
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    const requiredFields = ["staffId", "surname", "first_name", "mobile_phone"];
    const missingFields = requiredFields.filter(
      (field) => !data[field] || data[field].trim() === "",
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Check if staffId already exists
    const existingStaff = await NonTeachingStaff.findOne({
      staffId: data.staffId,
    });
    if (existingStaff) {
      return res.status(400).json({
        message: "Staff ID already exists",
      });
    }

    // Create new non-teaching staff
    const newStaff = new NonTeachingStaff(data);
    await newStaff.save();

    res.status(201).json({
      success: true,
      data: newStaff,
      message: "Non-teaching staff created successfully",
    });
  } catch (error) {
    console.error("Error creating non-teaching staff:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// PATCH /nonteachingStaff/:id - Update non-teaching staff
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Check if staff exists
    const existingStaff = await NonTeachingStaff.findById(id);
    if (!existingStaff) {
      return res.status(404).json({
        message: "Non-teaching staff not found",
      });
    }

    // Check if staffId is being changed and if it conflicts with existing staff
    if (data.staffId && data.staffId !== existingStaff.staffId) {
      const staffWithSameId = await NonTeachingStaff.findOne({
        staffId: data.staffId,
      });
      if (staffWithSameId) {
        return res.status(400).json({
          message: "Staff ID already exists",
        });
      }
    }

    // Update staff
    const updatedStaff = await NonTeachingStaff.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedStaff,
      message: "Non-teaching staff updated successfully",
    });
  } catch (error) {
    console.error("Error updating non-teaching staff:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// POST /nonteachingStaff/bulkUpload - Bulk upload non-teaching staff from CSV
router.post("/bulkUpload", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No CSV file uploaded",
      });
    }

    // Parse CSV content
    const csvContent = req.file.buffer.toString("utf-8");
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({
        message: "CSV file must contain header and at least one data row",
      });
    }

    // Parse CSV with proper handling of quoted fields
    const parseCSVRow = (row) => {
      const result = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result.map((v) => v.replace(/^"|"$/g, ""));
    };

    const headers = parseCSVRow(lines[0]);
    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);

      if (values.length !== headers.length) {
        errors.push({
          row: i + 1,
          message: `Incorrect number of columns. Expected ${headers.length}, got ${values.length}`,
        });
        continue;
      }

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      // Validate required fields
      const requiredFields = [
        "staffId",
        "surname",
        "first_name",
        "mobile_phone",
      ];
      const missingFields = requiredFields.filter(
        (field) => !row[field] || row[field].trim() === "",
      );

      if (missingFields.length > 0) {
        errors.push({
          row: i + 1,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
        continue;
      }

      data.push(row);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "CSV validation failed",
        errors,
      });
    }

    // Bulk insert staff
    const insertedStaff = [];
    const duplicateErrors = [];

    for (const staffData of data) {
      try {
        // Check for duplicate staffId
        const existingStaff = await NonTeachingStaff.findOne({
          staffId: staffData.staffId,
        });
        if (existingStaff) {
          duplicateErrors.push({
            staffId: staffData.staffId,
            message: "Staff ID already exists",
          });
          continue;
        }

        const newStaff = new NonTeachingStaff(staffData);
        await newStaff.save();
        insertedStaff.push(newStaff);
      } catch (error) {
        console.error(`Error inserting staff ${staffData.staffId}:`, error);
        errors.push({
          staffId: staffData.staffId,
          message: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        uploadedCount: insertedStaff.length,
        duplicateCount: duplicateErrors.length,
        errorCount: errors.length,
        duplicates: duplicateErrors,
        errors: errors,
      },
      message: `Successfully uploaded ${insertedStaff.length} staff members${duplicateErrors.length > 0 ? `, ${duplicateErrors.length} duplicates skipped` : ""}${errors.length > 0 ? `, ${errors.length} errors` : ""}`,
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
