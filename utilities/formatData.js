import fs from "fs";
import { School } from "../models/school.js";
import mysql from "mysql2/promise";

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

export function formatLearnerData(data) {
  let formattedData = {};

  for (const key in data) {
    if (data[key] !== "" && data[key] !== null && data[key] !== undefined) {
      if (key.includes("eccde")) {
        formattedData["eccde"] = formattedData["eccde"] || {};
        formattedData["eccde"][key] = data[key];
      } else if (key.includes("pry1")) {
        formattedData["primary1"] = formattedData["primary1"] || {};
        formattedData["primary1"][key] = data[key];
      } else if (key.includes("pry2")) {
        formattedData["primary2"] = formattedData["primary2"] || {};
        formattedData["primary2"][key] = data[key];
      } else if (key.includes("pry3")) {
        formattedData["primary3"] = formattedData["primary3"] || {};
        formattedData["primary3"][key] = data[key];
      } else if (key.includes("pry4")) {
        formattedData["primary4"] = formattedData["primary4"] || {};
        formattedData["primary4"][key] = data[key];
      } else if (key.includes("pry5")) {
        formattedData["primary5"] = formattedData["primary5"] || {};
        formattedData["primary5"][key] = data[key];
      } else if (key.includes("pry6")) {
        formattedData["primary6"] = formattedData["primary6"] || {};
        formattedData["primary6"][key] = data[key];
      } else if (key.includes("jss1")) {
        formattedData["ubeJss1"] = formattedData["ubeJss1"] || {};
        formattedData["ubeJss1"][key] = data[key];
      } else if (key.includes("jss2")) {
        formattedData["ubeJss2"] = formattedData["ubeJss2"] || {};
        formattedData["ubeJss2"][key] = data[key];
      } else if (key.includes("jss3")) {
        formattedData["ubeJss3"] = formattedData["ubeJss3"] || {};
        formattedData["ubeJss3"][key] = data[key];
      } else {
        formattedData[key] = data[key];
      }
    }
  }
  return formattedData;
}

export async function fetchMySQLData() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB1,
      port: process.env.DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
    });

    console.log("✅ MySQL connected");

    const [rows] = await connection.execute("SELECT * FROM schools");

    writeData(rows);

    await connection.end();
    return true;
  } catch (error) {
    console.error("Mysql connection error", error);
    return false;
  }
}

export async function fetchPayrollMySQLData() {
  let rows;

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB2,
    });

    console.log("✅ MySQL connected");

    [rows] = await connection.execute("SELECT * FROM payroll_sheet");

    await connection.end();
  } catch (error) {
    console.error("Mysql connection error", error);
  }

  return rows;
}

export async function fetchSchoolMysqlData() {
  let rows;

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB2,
    });

    console.log("✅ MySQL connected");

    [rows] = await connection.execute("SELECT * FROM school_db.schools");

    await connection.end();
  } catch (error) {
    console.error("Mysql connection error", error);
  }

  return rows;
}

export function writeData(data) {
  const jsonFile = JSON.stringify(data, null, 2);

  fs.writeFile("schools.json", jsonFile, (err) => {
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
