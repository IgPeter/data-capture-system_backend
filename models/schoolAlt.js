import mongoose from "mongoose";

const schoolAltSchema = new mongoose.Schema({}, { strict: false });

export const SchoolAlt = mongoose.model("school_alt", schoolAltSchema);
