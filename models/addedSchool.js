import mongoose from "mongoose";

const addedSchoolSchema = new mongoose.Schema({
  category: { type: String, required: true },
  type: { type: String, required: true },
  state: { type: String, required: true },
  lga: { type: String, required: true },
  town: { type: String, required: true },
  location: { type: String, required: true },
  level: { type: String, required: true },
  yearEstablished: { type: String, required: true },
});

export const AddedSchool = mongoose.model("AddedSchool", addedSchoolSchema);
