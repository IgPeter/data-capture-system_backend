import mongoose from "mongoose";
const Schema = mongoose.Schema;

const zoneSchema = new Schema({
  code: { type: String, enum: ["A", "B", "C"], required: true, unique: true },
  name: { type: String, required: true }, // "Zone A", "Zone B", "Zone C"
});

export const Zone = mongoose.model("Zone", zoneSchema);
