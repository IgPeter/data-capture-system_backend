import mongoose from "mongoose";
const Schema = mongoose.Schema;

const schoolSchema = new Schema({
  name: { type: String, required: true },
});

export const School = mongoose.model("School", schoolSchema);
