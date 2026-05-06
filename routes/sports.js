import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { Registration } from "../models/sports.js";
import { authJs } from "../middleware/auth.js";

const router = express.Router();

import { sportsEvents } from "../data/sportsEvents.js"; // if needed for validation

// Multer setup (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

// Submit Registration
// routes/sports.js
// routes/sports.js
// routes/sports.js
// routes/sports.js
// routes/sports.js
// routes/sports.js
router.post(
  "/register",
  upload.array("passportPhotos", 30),
  async (req, res) => {
    try {
      const {
        eventId,
        category,
        schoolName,
        schoolCode,
        lgea,
        educationSecretary,
        members,
      } = req.body;

      // Basic validation
      if (
        !eventId ||
        !category ||
        !schoolName ||
        !schoolCode ||
        !lgea ||
        !members
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields. School Code is required.",
        });
      }

      const parsedEventId = parseInt(eventId);
      const event = sportsEvents.find((e) => e.id === parsedEventId);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      let parsedMembers;
      try {
        parsedMembers = JSON.parse(members);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid members data format" });
      }

      if (!Array.isArray(parsedMembers) || parsedMembers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Members must be a non-empty array",
        });
      }

      // === ENHANCED CLEANING + ADD CATEGORY + MEMBER REG ID + ASSOCIATE PHOTOS ===
      const photoFiles = req.files || [];

      parsedMembers = parsedMembers.map((member, index) => {
        const base = {
          surname: member.surname,
          firstname: member.firstname,
          othernames: member.othernames || "",
          category: category,
          memberRegId: `MEM-${Math.floor(Math.random() * 100000)}`,
        };

        // Add type-specific fields
        if (category === "participants") {
          Object.assign(base, {
            age: member.age || "",
            gender: member.gender || "",
            class: member.class || "",
            arm: member.arm || "",
            headTeacher: member.headTeacher || "",
            classTeacher: member.classTeacher || "",
            healthConcern:
              category === "participants" ? member.healthConcern : undefined,
          });
        } else {
          Object.assign(base, {
            staffId: member.staffId || "",
            designation: member.designation || "",
            sportingArea: member.sportingArea || "",
          });
        }

        // Associate photo with this member (if available)
        if (photoFiles[index]) {
          // We'll upload and attach later
          base.tempPhotoIndex = index; // Temporary marker for upload
        }

        return base;
      });

      // Upload photos and attach to members
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        try {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                { folder: "subeb-sports/passports" },
                (error, result) => (error ? reject(error) : resolve(result)),
              )
              .end(file.buffer);
          });

          // Attach photo to the corresponding member
          if (parsedMembers[i]) {
            parsedMembers[i].passportPhoto = {
              url: result.secure_url,
              publicId: result.public_id,
            };
          }
        } catch (uploadError) {
          console.error(
            "Cloudinary upload failed for member",
            i,
            ":",
            uploadError,
          );
        }
      }

      // Find existing registration or create new
      let registration = await Registration.findOne({
        eventId: parsedEventId,
        schoolCode: schoolCode.trim(),
      });

      if (registration) {
        // Check maximum limits
        const existingMembers = registration.members;

        const currentCount =
          category === "participants" ?
            existingMembers.filter((m) => m.category === "participants").length
          : existingMembers.filter((m) => m.category === "technical").length;

        const maxAllowed =
          category === "participants" ?
            event.maxParticipants
          : event.maxTechnical || 0;

        if (currentCount >= maxAllowed) {
          return res.status(400).json({
            success: false,
            message: `You cannot register more than ${maxAllowed} ${category} for this event.`,
          });
        }

        // Update flags
        if (category === "participants") {
          registration.participantsSubmitted = true;
        } else if (category === "technical") {
          registration.technicalSubmitted = true;
        }

        // Append new members (with their photos)
        registration.members.push(...parsedMembers);
      } else {
        // First time registration
        registration = new Registration({
          eventId: parsedEventId,
          eventName: event.name,
          category,
          schoolName,
          schoolCode: schoolCode.trim(),
          educationSecretary:
            category === "participants" ? educationSecretary : undefined,
          lgea,
          members: parsedMembers,
          participantsSubmitted: category === "participants",
          technicalSubmitted: category === "technical",
          regId: `SUBEB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        });
      }

      await registration.save();

      // Return the last added member for individual summary
      const lastMember = parsedMembers[parsedMembers.length - 1];

      res.status(201).json({
        success: true,
        message: "Registration submitted successfully",
        regId: registration.regId,
        member: lastMember, // Single member for Summary Page
        registration,
      });
    } catch (error) {
      console.error("Registration Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save registration",
        error: error.message,
      });
    }
  },
);

router.get("/registration/:regId", async (req, res) => {
  try {
    const { regId } = req.params;

    const registration = await Registration.findOne(
      { members: { $elemMatch: { memberRegId: regId } } },
      {
        "members.$": 1,
        eventId: 1,
        eventName: 1,
        schoolName: 1,
        schoolCode: 1,
        lgea: 1,
        regId: 1,
      },
    ).lean(); // for better performance

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    res.status(200).json({
      success: true,
      registration,
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Optional: Also support lookup by schoolCode + eventId
router.get(
  "/registration/school/:schoolCode/event/:eventId",
  async (req, res) => {
    try {
      const { schoolCode, eventId } = req.params;

      const registration = await Registration.findOne({
        schoolCode,
        eventId: parseInt(eventId),
      }).lean();

      if (!registration) {
        return res
          .status(404)
          .json({ success: false, message: "Registration not found" });
      }

      res.status(200).json({ success: true, registration });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

//getting all registrations data for admin panel
router.get("/registrationall", authJs, async (req, res) => {
  try {
    const registrations = await Registration.find().lean();

    res.status(200).json({ success: true, registrations });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

export default router;
