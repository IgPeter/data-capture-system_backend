import mongoose from "mongoose";
const Schema = mongoose.Schema;

const learnerSchema = new Schema({
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
});

export const Learners = mongoose.model("Learners", learnerSchema);
