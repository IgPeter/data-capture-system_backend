import mongoose from "mongoose";
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: [
        "state_admin",
        "zonal_admin_A",
        "zonal_admin_B",
        "zonal_admin_C",
        "lga_admin",
        "school_admin",
        "staff",
      ],
      required: true,
    },
    // These fields will be assigned later by State Admin
    assignedZone: {
      type: String,
      enum: ["A", "B", "C", null],
      default: null,
    },
    assignedLga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lga",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
