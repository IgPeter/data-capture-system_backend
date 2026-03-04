import { School } from "../models/school.js";
import { Staff } from "../models/staff.js";
import { Learners } from "../models/learners.js";
import { Facilities } from "../models/facility.js";
import { getLevelFromSchoolName } from "../utilities/school-classifier.js";

export const computeDashboardStats = async () => {
  // ---------- BASIC TOTALS ----------
  const [schools, staffs, learners, facilities] = await Promise.all([
    School.find()
      .populate("staffs")
      .populate("learners")
      .populate("facilities"),

    Staff.find().populate("school"),
    Learners.find().populate("school"),
    Facilities.find().populate("school"),
  ]);

  // ---------- SCHOOL CLASSIFICATION ----------
  let primarySchools = 0;
  let secondarySchools = 0;
  let inactiveSchools = 0;

  schools.forEach((school) => {
    const staffs = school?.staffs || [];

    if (staffs.length === 0) {
      inactiveSchools++;
      return;
    }

    const categories = staffs.map((s) => s.schoolCategory?.toLowerCase());

    if (categories.includes("secondary")) {
      secondarySchools++;
      return;
    }

    if (categories.includes("primary") || categories.includes("eccde")) {
      primarySchools++;
      return;
    }
  });

  //----------- STAFF CLASSIFICATION------------
  let primaryStaffs = 0;
  let secondaryStaffs = 0;

  staffs.forEach((staff) => {
    const schoolCategory = staff.schoolCategory;

    if (schoolCategory == "primary") primaryStaffs++;
    if (schoolCategory == "secondary") secondaryStaffs++;
  });

  // ---------- LEARNER CLASSIFICATION ----------
  let primaryLearners = 0;
  let secondaryLearners = 0;
  let totalMales = 0;
  let totalFemales = 0;
  let grandLearnersTotal = 0;

  learners.forEach((learner) => {
    const level = getLevelFromSchoolName(learner?.school?.name);

    if (level === "primary") primaryLearners++;
    if (level === "secondary") secondaryLearners++;

    // Sum males
    totalMales += learner.eccde.eccde_male || 0;
    totalMales += learner.primary1.pry1_male || 0;
    totalMales += learner.primary2.pry2_male || 0;
    totalMales += learner.primary3.pry3_male || 0;
    totalMales += learner.primary4.pry4_male || 0;
    totalMales += learner.primary5.pry5_male || 0;
    totalMales += learner.primary6.pry6_male || 0;

    // Sum females
    totalFemales += learner.eccde.eccde_female || 0;
    totalFemales += learner.primary1.pry1_female || 0;
    totalFemales += learner.primary2.pry2_female || 0;
    totalFemales += learner.primary3.pry3_female || 0;
    totalFemales += learner.primary4.pry4_female || 0;
    totalFemales += learner.primary5.pry5_female || 0;
    totalFemales += learner.primary6.pry6_female || 0;
  });

  grandLearnersTotal = totalFemales + totalFemales;

  // ---------- FACILITY CLASSIFICATION ----------
  let primaryFacilities = 0;
  let secondaryFacilities = 0;
  let grandTotal = 0;
  let numericTotal = 0;
  let yesNoTotal = 0;

  facilities.forEach((facility) => {
    const level = getLevelFromSchoolName(facility?.school?.name);

    if (level === "primary") primaryFacilities++;
    if (level === "secondary") secondaryFacilities++;

    // Sum numeric fields with explicit Number conversion
    numericTotal += Number(facility.blocksOfClassroom) || 0;
    numericTotal += Number(facility.numOfClassrooms) || 0;
    numericTotal += Number(facility.numOfUsedClassrooms) || 0;
    numericTotal += Number(facility.primaryClassrooms) || 0;
    numericTotal += Number(facility.pitToilet) || 0;
    numericTotal += Number(facility.waterCloset) || 0;
    numericTotal += Number(facility.vipToilet) || 0;
    numericTotal += Number(facility.badPitToilet) || 0;
    numericTotal += Number(facility.badWaterCloset) || 0;
    numericTotal += Number(facility.badVipToilet) || 0;
    numericTotal += Number(facility.goodPitToilet) || 0;
    numericTotal += Number(facility.goodWaterCloset) || 0;
    numericTotal += Number(facility.goodVipToilet) || 0;
    numericTotal += Number(facility.mPitToilet) || 0;
    numericTotal += Number(facility.mWaterCloset) || 0;
    numericTotal += Number(facility.mVipToilet) || 0;
    numericTotal += Number(facility.eccdeChairs) || 0;
    numericTotal += Number(facility.primaryChairs) || 0;
    numericTotal += Number(facility.primaryTables) || 0;
    numericTotal += Number(facility.ubeJssChairs) || 0;
    numericTotal += Number(facility.ubeJssTables) || 0;
    numericTotal += Number(facility.teachersChairs) || 0;
    numericTotal += Number(facility.teachersTables) || 0;
    numericTotal += Number(facility.numOfBlackboards) || 0;
    numericTotal += Number(facility.numOfWhiteboards) || 0;

    // Sum yes/no fields (yes=1, no=0, ignore comments)
    yesNoTotal += facility.fence === "yes" ? 1 : 0;
    yesNoTotal += facility.agricFarm === "yes" ? 1 : 0;
    yesNoTotal += facility.sportFacility === "yes" ? 1 : 0;
    yesNoTotal += facility.eccdeVentilation === "yes" ? 1 : 0;
    yesNoTotal += facility.primaryVentilation === "yes" ? 1 : 0;
    yesNoTotal += facility.ubeJssVentilation === "yes" ? 1 : 0;
    yesNoTotal += facility.blackboard === "yes" ? 1 : 0;
    yesNoTotal += facility.whiteboard === "yes" ? 1 : 0;
    yesNoTotal += facility.textbook === "yes" ? 1 : 0;
    yesNoTotal += facility.lessonNotes === "yes" ? 1 : 0;
    yesNoTotal += facility.curriculum === "yes" ? 1 : 0;
    yesNoTotal += facility.eccdeLearningMaterials === "yes" ? 1 : 0;
  });

  grandTotal = numericTotal + yesNoTotal;

  return {
    stats: [
      {
        title: "Staffs",
        items: [
          { label: "Total Staffs", value: staffs.length, color: "teal" },
          {
            label: "Eccde & Primary Staffs",
            value: primaryStaffs,
            color: "red",
          },
          { label: "UBE JSS Staffs", value: secondaryStaffs, color: "green" },
        ],
      },
      {
        title: "Schools",
        items: [
          { label: "Total Schools", value: 1948, color: "teal" },
          {
            label: "Primary Schools",
            value: 1310,
            color: "red",
          },
          { label: "UBE JSS", value: 304, color: "teal" },
          { label: "ECCDE & Primary", value: 334, color: "green" },
          { label: "Inactive Schools", value: 246, color: "blue" },
        ],
      },
      {
        title: "Learners",
        items: [
          { label: "Total Learners", value: 223011, color: "teal" },
          {
            label: "Total Primary",
            value: 185031,
            color: "red",
          },
          { label: "Total ECCDE", value: 8111, color: "green" },
          { label: "Total UBE JSS", value: 30142, color: "green" },
        ],
      },
      {
        title: "Facilities",
        items: [
          { label: "Total Facilities", value: grandTotal, color: "teal" },
        ],
      },
    ],
    lastUpdated: new Date(),
  };
};
