import mongoose from "mongoose";

const Schema = mongoose.Schema;

const schoolWithLgaSchema = new Schema({
  name: { type: String, required: true },
  lga: { type: String, required: true },
  address: { type: String },
});

export const SchoolWithLga = mongoose.model(
  "SchoolWithLga",
  schoolWithLgaSchema
);
