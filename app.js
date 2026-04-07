// app.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import bodyParser from "body-parser";
import cors from "cors";
import { connectMongo } from "./database/db.js";
import LgaRouter from "./routes/lga.js";
import SchoolRouter from "./routes/school.js";
import StaffRouter from "./routes/staff.js";
import UserRouter from "./routes/user.js";
import LearnersRouter from "./routes/learners.js";
import FacilityRouter from "./routes/facility.js";
import DashboardRouter from "./routes/dashboard.js";
import SportsRouter from "./routes/sports.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();

// basic logs to help debugging
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const listening_ip = process.env.listeningIP || "localhost";

// --- SANITIZE API BASE ---
let api = process.env.API_URL; //?? "/api";
/*if (typeof api !== "string") api = "/api";
api = api.trim();
if (api === "" || api === "*" || api === "/*") {
  console.warn("Invalid API_URL in env; falling back to /api");
  api = "/api";
}
if (!api.startsWith("/")) api = `/${api}`; // ensure leading slash
// remove trailing slash
if (api.length > 1 && api.endsWith("/")) api = api.slice(0, -1);
console.log("Using API base:", api);
*/
// middlewares
app.use(morgan("tiny"));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*", // adjust this in production to restrict domains
  }),
);

console.log(`API base path: ${api}`);

// --- API ROUTES (use sanitized api) ---
app.use(`${api}/dashboard`, DashboardRouter);
app.use(`${api}/lga`, LgaRouter);
app.use(`${api}/school`, SchoolRouter);
app.use(`${api}/staffs`, StaffRouter);
app.use(`${api}/learners`, LearnersRouter);
app.use(`${api}/facilities`, FacilityRouter);
app.use(`${api}/users`, UserRouter);
app.use(`${api}/sports`, SportsRouter);

// static uploads
app.use(
  "/public/upload",
  express.static(path.join(__dirname, "public", "upload")),
);

// serve the built react app
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// --- FALLBACK: avoid path-to-regexp by using middleware ---
app.use((req, res, next) => {
  // only handle GET requests that accept HTML (SPA navigation)
  if (req.method !== "GET") return next();

  const accept = req.headers.accept || "";
  if (!accept.includes("text/html")) return next();

  // serve index.html
  res.sendFile("index.html", { root: distPath }, (err) => {
    if (err) {
      console.error("Error sending index.html:", err);
      next(err);
    }
  });
});

// connect DB + start server
/*await connectMongo().catch((err) => {
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
});*/

/*app.listen(PORT, listening_ip, () => {
  console.log(`App running at ${listening_ip}:${PORT}`);
});*/

export default app;
