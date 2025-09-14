import fs from "fs";

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
