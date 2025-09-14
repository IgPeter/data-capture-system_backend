import express from "express";
const router = express.Router();
import { Staff } from "../models/staff.js";
import { formatRequestBody } from "../utilities/formatData.js";
import multer from "multer";

const fileExtension = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

//configuring multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/upload");
  },

  filename: function (req, file, cb) {
    const fileName = file.originalname.replace(" ", "-");
    const extension = fileExtension[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const upload = multer({ storage: storage });

router.post(`/`, upload.single("avatar"), async (req, res) => {
  try {
    const data = req.body;

    const avatar = req.file;

    const fileName = req.file.filename;
    const filePath = `https://${req.get("host")}/public/upload`;

    if (!avatar) {
      res.status(400).json({ message: "Picure upload is neccessary" });
    }

    data.avatar = `${filePath}/${fileName}`;

    const formattedData = formatRequestBody(data);
    // ✅ Save to MongoDB
    const newStaff = new Staff(formattedData);
    await newStaff.save();

    res.status(201).json({ success: true, data: newStaff });
  } catch (error) {
    console.error("Error saving facility:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
