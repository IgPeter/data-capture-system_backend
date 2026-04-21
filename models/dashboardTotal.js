import mongoose from "mongoose";

const dashboardTotalSchema = new mongoose.Schema({}, { strict: false });

export const DashboardTotal = mongoose.model(
  "lga_summary_total",
  dashboardTotalSchema,
);
