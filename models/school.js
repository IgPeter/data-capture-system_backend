import mongoose from "mongoose";
const Schema = mongoose.Schema;

const schoolSchema = new Schema({
  name: { type: String, required: true },
  lga: { type: String, required: true },
  address: { type: String, required: true },
});

schoolSchema.virtual("staffs", {
  ref: "Staff",
  localField: "_id",
  foreignField: "school",
});

schoolSchema.virtual("learners", {
  ref: "Learners",
  localField: "_id",
  foreignField: "school",
});

schoolSchema.virtual("facilities", {
  ref: "Facilities",
  localField: "_id",
  foreignField: "school",
});

schoolSchema.set("toObject", { virtuals: true });
schoolSchema.set("toJSON", { virtuals: true });

export const School = mongoose.model("School", schoolSchema);
