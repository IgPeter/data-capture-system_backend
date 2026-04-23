import express from "express";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import { authJs } from "../middleware/auth.js";

const router = express.Router();

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/upload/user");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

// file filter (optional but recommended)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

router.post(`/register`, upload.single("avatar"), async (req, res) => {
  const userDetails = req.body;
  const file = req.file;

  const validRoles = [
    "state_admin",
    "zonal_admin_a",
    "zonal_admin_b",
    "zonal_admin_c",
    "school_admin",
    "staff",
  ];

  // 🔴 FIX: role was undefined before
  if (!validRoles.includes(userDetails.role)) {
    return res.status(400).json({ message: "Invalid role selected" });
  }

  try {
    const existingUser = await User.findOne({
      username: userDetails.username,
    });

    if (existingUser) {
      console.warn("⚠️ [Register] User already exists:", userDetails.username);
      return res.status(403).json({ message: "This user already exists" });
    }

    // ✅ avatar path
    let avatarPath = "";
    if (file) {
      avatarPath = `${req.protocol}://${req.get("host")}/public/upload/user/${file.filename}`;
    }

    const user = new User({
      _id: new mongoose.Types.ObjectId(),
      username: userDetails.username,
      password: bcrypt.hashSync(userDetails.password, 4),
      role: userDetails.role,
      gender: userDetails.gender,
      fullName: userDetails.fullName,
      assignedZone: userDetails.assignedZone || null, // Assign zone if provided, else null
      assignedLga: userDetails.assignedLga || null, // Assign LGA if provided, else null
      avatar: avatarPath,
      school: userDetails.school || null, // Assign school if provided, else null
    });

    const createdUser = await user.save();

    console.log(
      "🎉 [Register] User registered successfully:",
      createdUser.username,
    );

    res.status(201).json({
      message: "New user created successfully",
      createdUser,
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post(`/login`, async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username: username });

  if (!user) {
    return res.status(404).json({ message: "You don't have an account" });
  }

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        school: user.school,
        assignedLga: user.assignedLga,
        assignedZone: user.assignedZone,
      },
      process.env.SECRET,
      {
        expiresIn: "12h",
      },
    );

    res.status(200).json({
      message: "Login successful",
      success: true,
      token: token,
      user: user,
    });
  } else {
    res.status(400).json({ message: "Password is wrong", success: false });
  }
});

/*
=========================================
LOGIN ENDED
*/

router.get(`/profile`, authJs, async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

//LOGOUT
router.post(`/logout`, async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;
