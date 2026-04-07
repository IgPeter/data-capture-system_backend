// models/SchoolStats.js
import mongoose from "mongoose";

const schoolStatsSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      unique: true,
    },
    type: String, // eccde_only | primary_only | eccde_primary | secondary
  },
  { timestamps: true },
);

export const SchoolStats = mongoose.model("SchoolStats", schoolStatsSchema);
