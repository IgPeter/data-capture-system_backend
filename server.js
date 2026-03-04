import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { startDashboardWatcher } from "./realtime/dashboardWatcher.js";
import { connectMongo } from "./database/db.js";

const PORT = process.env.PORT || 5000;

const DB_URI = process.env.MONGO_URI;

const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
});

// ✅ THIS is where your line goes
await connectMongo().catch((err) => {
  console.error("Mongo connection failed:", err);
  // optionally exit process if DB is critical
});

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected");
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected, will retry...");
});

mongoose.connection.on("reconnectFailed", () => {
  console.log("❌ MongoDB reconnection failed");
});

// start live dashboard updates
startDashboardWatcher();

// start server AFTER DB connects
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
