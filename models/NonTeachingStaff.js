// models/NonTeachingStaff.js
import mongoose from "mongoose";

const nonTeachingStaffSchema = new mongoose.Schema(
  {
    staffId: { type: String, required: true, unique: true },

    surname: String,
    first_name: String,
    middle_name: String,

    date_of_birth: Date,
    mobile_phone: String,

    appt_date: Date,

    current_grade_level: String,
    current_step: String,
    salary_structure: String,

    current_designation: String,
    dept: String,
    mda: String,

    retirement_date: Date,
  },
  { timestamps: true },
);

export const NonTeachingStaff = mongoose.model(
  "NonTeachingStaff",
  nonTeachingStaffSchema,
);
