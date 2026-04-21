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

router.get("/facility-summary", async (req, res) => {
  try {
    const result = await Facilities.aggregate([
      // ✅ Only valid documents
      {
        $match: {
          blocksOfClassroom: { $type: "number" },
        },
      },

      // ✅ Join school (get LGA)
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "schoolData",
        },
      },
      {
        $unwind: {
          path: "$schoolData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ Normalize fields
      {
        $addFields: {
          lga: "$schoolData.lga",

          pitToilet: { $ifNull: ["$pitToilet", 0] },
          waterCloset: { $ifNull: ["$waterCloset", 0] },
          vipToilet: { $ifNull: ["$vipToilet", 0] },

          eccdeChairs: { $ifNull: ["$eccdeChairs", 0] },
          primaryChairs: { $ifNull: ["$primaryChairs", 0] },
          ubeJssChairs: { $ifNull: ["$ubeJssChairs", 0] },
          teachersChairs: { $ifNull: ["$teachersChairs", 0] },

          primaryTables: { $ifNull: ["$primaryTables", 0] },
          ubeJssTables: { $ifNull: ["$ubeJssTables", 0] },
          teachersTables: { $ifNull: ["$teachersTables", 0] },

          numOfClassrooms: {
            $convert: {
              input: "$numOfClassrooms",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          numOfBlackboards: {
            $convert: {
              input: "$numOfBlackboards",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          numOfWhiteboards: {
            $convert: {
              input: "$numOfWhiteboards",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },

      // ✅ Compute per-document totals (CRITICAL)
      {
        $addFields: {
          totalChairs: {
            $add: [
              "$eccdeChairs",
              "$primaryChairs",
              "$ubeJssChairs",
              "$teachersChairs",
            ],
          },

          totalTables: {
            $add: ["$primaryTables", "$ubeJssTables", "$teachersTables"],
          },

          totalToilets: {
            $add: ["$pitToilet", "$waterCloset", "$vipToilet"],
          },

          documentTotal: {
            $add: [
              "$pitToilet",
              "$waterCloset",
              "$vipToilet",
              "$eccdeChairs",
              "$primaryChairs",
              "$primaryTables",
              "$ubeJssChairs",
              "$ubeJssTables",
              "$teachersChairs",
              "$teachersTables",
              "$numOfClassrooms",
              "$numOfBlackboards",
              "$numOfWhiteboards",
            ],
          },
        },
      },

      // ✅ GROUP BY LGA
      {
        $group: {
          _id: "$lga",

          totalFacilities: { $sum: "$documentTotal" },
          totalClassrooms: { $sum: "$numOfClassrooms" },
          totalChairs: { $sum: "$totalChairs" },
          totalTables: { $sum: "$totalTables" },

          totalWhiteboards: { $sum: "$numOfWhiteboards" },
          totalBlackboards: { $sum: "$numOfBlackboards" },

          totalToilets: { $sum: "$totalToilets" },
          pitToilets: { $sum: "$pitToilet" },
          wcsToilets: { $sum: "$waterCloset" },
          vipToilets: { $sum: "$vipToilet" },
        },
      },

      // ✅ GRAND TOTAL + LGA breakdown
      {
        $group: {
          _id: null,

          grandTotal: { $sum: "$totalFacilities" },
          totalClassrooms: { $sum: "$totalClassrooms" },
          totalChairs: { $sum: "$totalChairs" },
          totalTables: { $sum: "$totalTables" },

          totalWhiteboards: { $sum: "$totalWhiteboards" },
          totalBlackboards: { $sum: "$totalBlackboards" },

          totalToilets: { $sum: "$totalToilets" },
          pitToilets: { $sum: "$pitToilets" },
          wcsToilets: { $sum: "$wcsToilets" },
          vipToilets: { $sum: "$vipToilets" },

          lgaBreakdown: {
            $push: {
              lga: "$_id",
              totalFacilities: "$totalFacilities",
              totalClassrooms: "$totalClassrooms",
              totalChairs: "$totalChairs",
              totalTables: "$totalTables",

              totalWhiteboards: "$totalWhiteboards",
              totalBlackboards: "$totalBlackboards",

              totalToilets: "$totalToilets",
              pitToilets: "$pitToilets",
              wcsToilets: "$wcsToilets",
              vipToilets: "$vipToilets",
            },
          },
        },
      },
    ]);

    res.json(result[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/facility-summary-unstructured", async (req, res) => {
  try {
    const result = await Facilities.aggregate([
      {
        $match: {
          blocksOfClassroom: { $type: "string" },
        },
      },

      // Join school to get LGA
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "school",
        },
      },

      { $unwind: "$school" },

      // Extract numeric values safely
      {
        $addFields: {
          blocksNum: {
            $cond: [
              { $regexMatch: { input: "$blocksOfClassroom", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$blocksOfClassroom", 0, 1] } },
              0,
            ],
          },

          eccdeNum: {
            $cond: [
              { $regexMatch: { input: "$eccdeClassroom", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$eccdeClassroom", 0, 1] } },
              0,
            ],
          },

          primaryNum: {
            $cond: [
              { $regexMatch: { input: "$primaryClassroom", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$primaryClassroom", 0, 1] } },
              0,
            ],
          },

          jssNum: {
            $cond: [
              { $regexMatch: { input: "$ubeJssClassroom", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$ubeJssClassroom", 0, 1] } },
              0,
            ],
          },

          eccdeFurnitureNum: {
            $cond: [
              { $regexMatch: { input: "$eccdeFurniture", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$eccdeFurniture", 0, 1] } },
              0,
            ],
          },

          primaryFurnitureNum: {
            $cond: [
              { $regexMatch: { input: "$primaryFurniture", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$primaryFurniture", 0, 1] } },
              0,
            ],
          },

          jssFurnitureNum: {
            $cond: [
              { $regexMatch: { input: "$ubeJssFurniture", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$ubeJssFurniture", 0, 1] } },
              0,
            ],
          },

          teacherFurnitureNum: {
            $cond: [
              { $regexMatch: { input: "$teachersFurniture", regex: /^[0-9]/ } },
              { $toInt: { $substrBytes: ["$teachersFurniture", 0, 1] } },
              0,
            ],
          },
        },
      },

      // Compute totals per facility
      {
        $addFields: {
          classroomsPerBlock: {
            $add: ["$eccdeNum", "$primaryNum", "$jssNum"],
          },

          totalClassrooms: {
            $multiply: [
              { $add: ["$eccdeNum", "$primaryNum", "$jssNum"] },
              "$blocksNum",
            ],
          },

          totalFurniture: {
            $add: [
              "$eccdeFurnitureNum",
              "$primaryFurnitureNum",
              "$jssFurnitureNum",
              "$teacherFurnitureNum",
            ],
          },
        },
      },

      // Compute whiteboards, blackboards and toilets
      {
        $addFields: {
          totalWhiteboards: {
            $cond: [{ $eq: ["$whiteboard", "yes"] }, "$totalClassrooms", 0],
          },

          totalBlackboards: {
            $cond: [{ $eq: ["$blackboard", "yes"] }, "$totalClassrooms", 0],
          },

          totalToilets: {
            $cond: [{ $eq: ["$toilet", "yes"] }, "$blocksNum", 0],
          },
        },
      },

      {
        $facet: {
          // GRAND TOTAL
          grandTotal: [
            {
              $group: {
                _id: null,
                totalClassrooms: { $sum: "$totalClassrooms" },
                totalFurniture: { $sum: "$totalFurniture" },
                totalWhiteboards: { $sum: "$totalWhiteboards" },
                totalBlackboards: { $sum: "$totalBlackboards" },
                totalToilets: { $sum: "$totalToilets" },
              },
            },
            {
              $addFields: {
                grandTotal: {
                  $add: [
                    "$totalClassrooms",
                    "$totalFurniture",
                    "$totalWhiteboards",
                    "$totalBlackboards",
                    "$totalToilets",
                  ],
                },
              },
            },
            { $project: { _id: 0 } },
          ],

          // LGA TOTALS
          lgaTotals: [
            {
              $group: {
                _id: "$school.lga",
                totalClassrooms: { $sum: "$totalClassrooms" },
                totalFurniture: { $sum: "$totalFurniture" },
                totalWhiteboards: { $sum: "$totalWhiteboards" },
                totalBlackboards: { $sum: "$totalBlackboards" },
                totalToilets: { $sum: "$totalToilets" },
              },
            },
            {
              $addFields: {
                totalFacilities: {
                  $add: [
                    "$totalClassrooms",
                    "$totalFurniture",
                    "$totalWhiteboards",
                    "$totalBlackboards",
                    "$totalToilets",
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                lga: "$_id",
                totalFacilities: 1,
                totalClassrooms: 1,
                totalFurniture: 1,
                totalWhiteboards: 1,
                totalBlackboards: 1,
                totalToilets: 1,
              },
            },
          ],
        },
      },
    ]);

    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//GETTING FACILITY SUMMARY ONCE AND FOR ALL
router.get("/facility-summary-new", async (req, res) => {
  try {
    const result = await Facilities.aggregate([
      // 1. JOIN SCHOOLS
      {
        $lookup: {
          from: "schools",
          localField: "school",
          foreignField: "_id",
          as: "schoolData",
        },
      },
      {
        $unwind: {
          path: "$schoolData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 2. NORMALIZE DATA (🔥 BULLETPROOF)
      {
        $addFields: {
          lga: "$schoolData.lga",

          // YES / NO → 1 / 0
          fenceVal: { $cond: [{ $eq: ["$fence", "yes"] }, 1, 0] },
          agricFarmVal: { $cond: [{ $eq: ["$agricFarm", "yes"] }, 1, 0] },
          sportFacilityVal: {
            $cond: [{ $eq: ["$sportFacility", "yes"] }, 1, 0],
          },
          blackboardVal: { $cond: [{ $eq: ["$blackboard", "yes"] }, 1, 0] },
          whiteboardVal: { $cond: [{ $eq: ["$whiteboard", "yes"] }, 1, 0] },

          // FORCE EVERYTHING TO NUMBER
          blocksOfClassroom: {
            $convert: {
              input: "$blocksOfClassroom",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          numOfClassrooms: {
            $convert: {
              input: "$numOfClassrooms",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          numOfUsedClassrooms: {
            $convert: {
              input: "$numOfUsedClassrooms",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          primaryClassrooms: {
            $convert: {
              input: "$primaryClassrooms",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },

          pitToilet: {
            $convert: { input: "$pitToilet", to: "int", onError: 0, onNull: 0 },
          },
          waterCloset: {
            $convert: {
              input: "$waterCloset",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          vipToilet: {
            $convert: { input: "$vipToilet", to: "int", onError: 0, onNull: 0 },
          },

          badPitToilet: {
            $convert: {
              input: "$badPitToilet",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          badWaterCloset: {
            $convert: {
              input: "$badWaterCloset",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          badVipToilet: {
            $convert: {
              input: "$badVipToilet",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },

          goodPitToilet: {
            $convert: {
              input: "$goodPitToilet",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          goodWaterCloset: {
            $convert: {
              input: "$goodWaterCloset",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          goodVipToilet: {
            $convert: {
              input: "$goodVipToilet",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },

          mPitToilet: {
            $convert: {
              input: "$mPitToilet",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          mWaterCloset: {
            $convert: {
              input: "$mWaterCloset",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          mVipToilet: {
            $convert: {
              input: "$mVipToilet",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },

          eccdeChairs: {
            $convert: {
              input: "$eccdeChairs",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          primaryChairs: {
            $convert: {
              input: "$primaryChairs",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          ubeJssChairs: {
            $convert: {
              input: "$ubeJssChairs",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          teachersChairs: {
            $convert: {
              input: "$teachersChairs",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },

          primaryTables: {
            $convert: {
              input: "$primaryTables",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          ubeJssTables: {
            $convert: {
              input: "$ubeJssTables",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          teachersTables: {
            $convert: {
              input: "$teachersTables",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },

          numOfBlackboards: {
            $convert: {
              input: "$numOfBlackboards",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
          numOfWhiteboards: {
            $convert: {
              input: "$numOfWhiteboards",
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },

      // 3. COMPUTE TOTALS PER DOCUMENT
      {
        $addFields: {
          totalChairs: {
            $add: [
              "$eccdeChairs",
              "$primaryChairs",
              "$ubeJssChairs",
              "$teachersChairs",
            ],
          },

          totalTables: {
            $add: ["$primaryTables", "$ubeJssTables", "$teachersTables"],
          },

          totalToilets: {
            $add: ["$pitToilet", "$waterCloset", "$vipToilet"],
          },

          totalFacilities: {
            $add: [
              "$pitToilet",
              "$waterCloset",
              "$vipToilet",
              "$fenceVal",
              "$agricFarmVal",
              "$sportFacilityVal",
              "$eccdeChairs",
              "$primaryChairs",
              "$primaryTables",
              "$ubeJssChairs",
              "$ubeJssTables",
              "$teachersChairs",
              "$teachersTables",
              "$numOfBlackboards",
              "$numOfWhiteboards",
            ],
          },
        },
      },

      // 4. GRAND TOTAL + LGA TOTALS
      {
        $facet: {
          grandTotal: [
            {
              $group: {
                _id: null,
                totalFacilities: { $sum: "$totalFacilities" },
                totalChairs: { $sum: "$totalChairs" },
                totalTables: { $sum: "$totalTables" },
                totalWhiteboards: { $sum: "$numOfWhiteboards" },
                totalBlackboards: { $sum: "$numOfBlackboards" },
                totalToilets: { $sum: "$totalToilets" },
                pitToilets: { $sum: "$pitToilet" },
                wcsToilets: { $sum: "$waterCloset" },
                vipToilets: { $sum: "$vipToilet" },
              },
            },
          ],

          byLga: [
            {
              $group: {
                _id: "$lga",
                totalFacilities: { $sum: "$totalFacilities" },
                totalChairs: { $sum: "$totalChairs" },
                totalTables: { $sum: "$totalTables" },
                totalWhiteboards: { $sum: "$numOfWhiteboards" },
                totalBlackboards: { $sum: "$numOfBlackboards" },
                totalToilets: { $sum: "$totalToilets" },
                pitToilets: { $sum: "$pitToilet" },
                wcsToilets: { $sum: "$waterCloset" },
                vipToilets: { $sum: "$vipToilet" },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error generating facility summary",
    });
  }
});

router.get("/facilityCountPerType", async (req, res) => {
  try {
    const result = await Facilities.aggregate([
      {
        $lookup: {
          from: "schoolstats",
          localField: "school",
          foreignField: "school",
          as: "schoolInfo",
        },
      },
      { $unwind: "$schoolInfo" },
      {
        $group: {
          _id: "$schoolInfo.type",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
