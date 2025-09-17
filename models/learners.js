import mongoose from "mongoose";
const Schema = mongoose.Schema;

const learnerSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "School", required: true },
  fullName: String,
  schoolName: String,
  class: String,
  age: Number,
  dateOfBirth: Date,
  gender: String,
  lga: String,
  nin: String,
  address: String,
  parent: String,
  arm: String,
  yearAdmitted: String,
  capturedBy: String,
  longitude: String,
  latitude: String,
});

export const Learners = mongoose.model("Learners", learnerSchema);
