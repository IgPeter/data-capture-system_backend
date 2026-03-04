import express from "express";
const router = express.Router();
import { Facilities } from "../models/facility.js";
import { formatRequestBody, initSchoolData } from "../utilities/formatData.js";

router.post(`/`, async (req, res) => {
  const { data, school } = req.body;

  if (!school || Object.keys(school).length == 0) {
    return res
      .status(403)
      .json({ message: "Cannot upload any data without a school" });
  }

  try {
    const formattedData = formatRequestBody(data);

    //initializing school data
    const schoolData = await initSchoolData(school);

    // ✅ Save to MongoDB
    const newFacility = new Facilities(formattedData);
    newFacility.school = schoolData._id;
    const response = await newFacility.save();

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error saving facility:", error);
    res.status(500).json({ success: false });
  }
});

router.get("/", async (req, res) => {
  const { lga } = req.query;

  try {
    const facilitiesList = await Facilities.find().populate("school");

    if (!facilitiesList.length) {
      return res.status(404).json({ message: "No facilities found" });
    }

    // ✅ If no LGA → return full list
    if (!lga || lga === "All Lgas") {
      return res.status(200).json({
        message: "Facilities fetched successfully",
        data: facilitiesList,
        facilitiesCount: facilitiesList.length,
      });
    }

    // ✅ Filter by LGA
    const facilitiesByLga = facilitiesList.filter(
      (facility) => facility?.school?.lga === lga,
    );

    let numericTotal = 0;
    let yesNoTotal = 0;

    facilitiesByLga.forEach((facility) => {
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

    const grandTotal = numericTotal + yesNoTotal;

    return res.status(200).json({
      message: "Facilities total by LGA fetched successfully",
      data: facilitiesByLga,
      facilityCount: grandTotal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
