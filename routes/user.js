import express from "express";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const router = express.Router();

router.post(`/register`, async (req, res) => {
  const userDetails = req.body;

  const existingUser = await User.find({ username: userDetails.username });

  if (existingUser.length > 0) {
    console.warn("⚠️ [Register] User already exists:", userDetails.username);
    return res.status(403).json({ message: "This user already exists" });
  }

  const user = new User({
    _id: new mongoose.Types.ObjectId(),
    username: userDetails.username,
    password: bcrypt.hashSync(userDetails.password, 4),
    role: userDetails.role,
  });

  try {
    //saving user details
    const createdUser = await user.save();

    //JSON response with user details
    console.log(
      "🎉 [Register] User registered successfully:",
      createdUser.username,
    );

    res.status(201).json({
      message: "New user created successfully",
      createdUser: createdUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("Internal Server Error");
  }
});

router.post(`/login`, async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username: username });

  if (!user) {
    return res.status(404).json({ message: "You don't have an account" });
  }

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user.id }, process.env.SECRET, {
      expiresIn: "12h",
    });

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

router.get(`/profile`, async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRET);

    const userId = decoded.userId;

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

export default router;
