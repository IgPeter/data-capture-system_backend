import mongoose from "mongoose";
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["state admin", "zonal admin", "school admin", "staff"],
    required: true,
  },
  avatar: { type: String },
});

export const User = mongoose.model("User", userSchema);
