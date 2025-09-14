import { targetDb } from "../database/db.js";
import fs from "fs";

export async function formatData(data) {
  const formatted = {};

  //Let's begin
  data.forEach((row) => {
    const lga = row.lga.trim();
    if (!formatted[lga]) {
      formatted[lga] = new Set();
    }
    formatted[lga].add(row.school.trim());
  });

  // Step 3: Save into new DB
  for (const [lga, schools] of Object.entries(formatted)) {
    // Insert LGA (ignore if exists to avoid duplicates)
    const [result] = await targetDb.execute(
      "INSERT IGNORE INTO lga (lga_name) VALUES (?)",
      [lga]
    );

    // If new LGA inserted, get id; else fetch existing one
    let lgaId = result.lga_id;

    if (!lgaId) {
      const [existing] = await targetDb.execute(
        "SELECT lga_id FROM lga WHERE lga_name = ?",
        [lga]
      );

      lgaId = existing[0].lga_id;
    }

    // Insert Schools under that LGA
    for (const school of schools) {
      await targetDb.execute(
        "INSERT IGNORE INTO schools (school_name, lga_id) VALUES (?, ?)",
        [school, lgaId]
      );
    }
  }
}

export function formatRequestBody(data) {
  // ✅ Dynamically build a clean object
  let newObj = {};

  for (const key in data) {
    if (data[key] !== "" && data[key] !== null && data[key] !== undefined) {
      newObj[key] = data[key];
    }
  }

  return newObj;
}

export function writeData(data) {
  const jsonFile = JSON.stringify(data, null, 2);

  fs.writeFile("teachers.json", jsonFile, (err) => {
    if (err) {
      console.error("Error writing file", err);
    } else {
      console.log("It has been written");
    }
  });
}

export function getUniqueLga(data) {
  const seen = {};
  const uniques = [];
  for (let i = 0; i < data.length; i++) {
    let s = data[i];
    if (typeof s !== "string") continue;
    s = s.trim();
    if (s === "") continue;
    if (!seen[s]) {
      seen[s] = true;
      uniques.push(s);
    }
  }

  return uniques;
}
