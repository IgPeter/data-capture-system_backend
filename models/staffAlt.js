import mongoose from "mongoose";

const staffAltSchema = new mongoose.Schema({}, { strict: false });

export const StaffAlt = mongoose.model("staffs_alt", staffAltSchema);
