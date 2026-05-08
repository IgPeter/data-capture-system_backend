import mongoose from "mongoose";

const schoolAccountsSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  schoolName: { type: String, required: true },
  schoolCode: { type: String, required: true },
});

export const SchoolAccount = mongoose.model(
  "SchoolAccount",
  schoolAccountsSchema,
);
