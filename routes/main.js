import express from "express";
import { sourceDb } from "../database/db.js";
import { formatData, writeData } from "../utilities/formatData.js";
const router = express.Router();

//This route was used only once
router.post(`/migrate-data`, async (req, res) => {
  try {
    //Getting all data in db
    const [allData] = await sourceDb.execute(`SELECT * FROM teacher`);
    writeData(allData);
    formatData(allData);

    res.status(200).json({ message: "Migration done successfully" });
  } catch (error) {
    console.log("Something isn't right");
  }
});

export default router;
