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
        "zonal_admin_a",
        "zonal_admin_b",
        "zonal_admin_c",
        "school_admin",
        "staff",
      ],
      required: true,
    },
    fullName: { type: String, required: true },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    // These fields will be assigned later by State Admin
    assignedZone: {
      type: String,
      enum: ["A", "B", "C"],
      default: null,
    },
    assignedLga: {
      type: String,
      enum: [
        "ALL",
        "ADO",
        "APA",
        "AGATU",
        "OHIMINI",
        "BURUKU",
        "GBOKO",
        "GUMA",
        "GWER-EAST",
        "GWER-WEST",
        "KATSINA-ALA",
        "KWANDE",
        "LOGO",
        "OBI",
        "OKPOKWU",
        "KONSHISHA",
        "OTUKPO",
        "UKUM",
        "MAKURDI",
        "VANDEIKYA",
        "OJU",
        "OGBADIBO",
        "TARKA",
        "USHONGO",
      ],
      default: null,
    },
    school: { type: Schema.Types.ObjectId, ref: "School", default: null },
    avatar: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
