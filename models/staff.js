import mongoose from "mongoose";
const Schema = mongoose.Schema;

const StaffSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "School", required: true },
  fullName: String,
  staffId: String,
  dob: Date,
  gender: String,
  schoolName: String,
  phoneNumber: String,
  schoolCategory: String,
  staffCategory: String,
  state: String,
  lga: String,
  nin: String,
  email: String,
  address: String,
  maritalStatus: String,
  employer: String,
  employmentType: String,
  appointmentDate: Date,
  dateLastAppointment: Date,
  lastPromotion: Date,
  lastGradeLevel: String,
  presentGradeLevel: String,
  computerLiteracy: String,
  staffTraining: String,
  highestAcademicQaulification: String,
  subjectArea: String,
  documentSighted: String,
  avatar: String,
  capturedBy: String,
  longitude: String,
  latitude: String,
});

export const Staff = mongoose.model("Staff", StaffSchema);
