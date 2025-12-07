import express from "express";
import fs from "fs/promises"; // use promises instead of callbacks
import { fetchMySQLData, getUniqueLga } from "../utilities/formatData.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await fetchMySQLData();

    if (!result) {
      return res
        .status(500)
        .json({ message: "Error fetching data from MySQL" });
    }

    // read file using fs/promises
    const data = await fs.readFile("./schools.json", "utf-8");

    let allSchools;

    try {
      allSchools = JSON.parse(data);
    } catch (parseError) {
      return res.status(500).json({ message: "Invalid JSON format" });
    }

    // filter staff with valid lga only
    const lgas = allSchools
      .filter((school) => school && school.LGEA)
      .map((school) => school.LGEA.trim());

    const uniqueLga = getUniqueLga(lgas);

    const uniqueLgaObjects = uniqueLga.map((name, index) => ({
      id: index + 1,
      name,
    }));

    res.status(200).json({ message: "Lgas returned", data: uniqueLgaObjects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
