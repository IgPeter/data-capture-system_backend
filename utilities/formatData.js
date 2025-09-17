import fs from "fs";
import { School } from "../models/school.js";

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

export async function initSchoolData(school) {
  let schoolData;

  //adding school
  const passedSchool = await School.find({ name: school });

  if (!passedSchool.length > 0) {
    const newSchool = new School({
      name: school,
    });

    //save school to mongoDB
    schoolData = await newSchool.save();
  } else {
    schoolData = passedSchool[0];
  }

  return schoolData;
}
