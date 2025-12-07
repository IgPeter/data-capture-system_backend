import mongoose from "mongoose";
const Schema = mongoose.Schema;

const StaffSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "School", required: true },
  staffId: String,
  surname: String,
  middle_name: String,
  first_name: String,
  date_of_birth: Date,
  gender: String,
  schoolName: String,
  mobile_phone: String,
  mda: String,
  schoolCategory: String,
  current_description: String,
  nin: String,
  email: String,
  address: String,
  maritalStatus: String,
  employer: String,
  employmentType: String,
  appt_date: Date,
  lastPromotion: String,
  lastGradeLevel: String,
  current_grade_level: String,
  current_step: String,
  computerLiteracy: String,
  staffTraining: String,
  highestAcademicQaulification: String,
  subjectArea: String,
  avatar: String,
  capturedBy: String,
  longitude: String,
  latitude: String,
  dateCreated: { type: Date, default: Date.now },
});

export const Staff = mongoose.model("Staff", StaffSchema);
