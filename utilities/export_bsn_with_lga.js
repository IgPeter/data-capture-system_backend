import mongoose from "mongoose";
import fs from "fs";

// 🔹 Replace with your MongoDB connection
const MONGO_URI =
  "mongodb+srv://igagapeter477_db_admin:%40Shalomigaga12@cluster0.lytt16u.mongodb.net/subebe_capture?retryWrites=true&w=majority&appName=Cluster0";

// 🔹 Define minimal schema (no need for full schema)
const staffSchema = new mongoose.Schema({}, { strict: false });
const Staff = mongoose.model("Staff", staffSchema, "staffs");

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const result = await Staff.aggregate([
      {
        $match: {
          staffId: { $regex: "^BSN" },
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          schoolName: "$school.name",
          lga: "$school.lga",
        },
      },
      {
        $unset: ["_id", "school"],
      },
      {
        // 🔥 group to get count per school
        $group: {
          _id: {
            schoolName: "$schoolName",
            lga: "$lga",
          },
          staffs: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.schoolName": 1,
        },
      },
    ]);

    console.log(`✅ Found ${result.length} schools with BSN staff`);

    let csv = "";

    // Header
    csv +=
      [
        "School",
        "LGA",
        "Total Staff",
        "Staff ID",
        "Surname",
        "First Name",
        "Gender",
        "Phone",
        "Grade",
        "Subject",
      ].join(",") + "\n";

    result.forEach((group) => {
      const schoolName = group._id.schoolName || "Unknown School";
      const lga = group._id.lga || "";
      const count = group.count;

      // 🔥 School row WITH count
      csv += `\n"${schoolName}","${lga}","${count}"\n`;

      // Staff rows
      group.staffs.forEach((staff) => {
        csv +=
          [
            "", // indent
            "", // lga empty for staff rows
            "", // count empty
            `"${staff.staffId || ""}"`,
            `"${staff.surname || ""}"`,
            `"${staff.first_name || ""}"`,
            `"${staff.gender || ""}"`,
            `"${staff.mobile_phone || ""}"`,
            `"${staff.current_grade_level || ""}"`,
            `"${staff.subjectArea || ""}"`,
          ].join(",") + "\n";
      });
    });

    // 🔹 Save file
    fs.writeFileSync("bsn_staff_with_lga_report.csv", csv);

    console.log("🎉 CSV exported: bsn_staff_with_lga_report.csv");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    return;
  }
}

run();
