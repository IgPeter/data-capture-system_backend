import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import bodyParser from "body-parser";
import cors from "cors";
import { connectMongo } from "./database/db.js";
import MainRouter from "./routes/main.js";
import LgaRouter from "./routes/lga.js";
import SchoolRouter from "./routes/school.js";
import StaffRouter from "./routes/staff.js";
import LearnersRouter from "./routes/learners.js";
import FacilityRouter from "./routes/facility.js";
import path from "path";
import { fileURLToPath } from "url";
const app = express();

//configuring dotenv
dotenv.config();

//env variables
const PORT = process.env.PORT;
const api = process.env.API_URL;

//configuring __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//using middlewares
app.use(morgan("tiny"));
app.use(bodyParser.json());
app.use(cors());

//configuring routes
app.use(`${api}/main`, MainRouter);
app.use(`${api}/lga`, LgaRouter);
app.use(`${api}/school`, SchoolRouter);
app.use(`${api}/staffs`, StaffRouter);
app.use(`${api}/learners`, LearnersRouter);
app.use(`${api}/facilities`, FacilityRouter);

//serving static files
app.use(
  "/public/upload",
  express.static(path.join(__dirname, "public", "upload"))
);

//Database connection
connectMongo();

app.listen(PORT, () => {
  console.log(`app running at port ${PORT}`);
});
