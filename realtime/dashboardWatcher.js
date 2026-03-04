import mongoose from "mongoose";
import { computeDashboardStats } from "../services/dashboard-stats-service.js";
import { io } from "../server.js";

export const startDashboardWatcher = () => {
  const collections = ["schools", "staffs", "learners", "facilities"];

  collections.forEach((name) => {
    mongoose.connection
      .collection(name)
      .watch()
      .on("change", async () => {
        const stats = await computeDashboardStats();
        io.emit("dashboardStatsUpdated", stats);
      });
  });
};
