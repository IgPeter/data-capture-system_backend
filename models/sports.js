import mongoose from "mongoose";
const { Schema } = mongoose;

const memberSchema = new Schema({
  surname: { type: String, required: true },
  firstname: { type: String, required: true },
  othernames: { type: String },

  // Common fields for both types
  age: { type: Number },
  gender: { type: String },

  // Technical Team specific fields
  staffId: { type: String },
  designation: { type: String },
  sportingArea: { type: String },

  // Category per member
  category: {
    type: String,
    enum: ["participants", "technical"],
    required: true,
  },

  // Unique registration number per individual member
  memberRegId: {
    type: String,
    unique: true,
    required: true,
  },

  // NEW: Each member now has their own passport photo
  passportPhoto: {
    url: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
});

const registrationSchema = new Schema({
  eventId: { type: Number, required: true },
  eventName: { type: String, required: true },

  // School level information
  schoolName: { type: String, required: true },
  schoolCode: { type: String, required: true },
  lgea: { type: String, required: true },

  // Participants-only school fields
  className: { type: String },
  arm: { type: String },
  classTeacher: { type: String },
  headTeacher: { type: String },
  educationSecretary: { type: String },
  healthConcern: { type: String },

  // Members array (each member now carries their own photo)
  members: [memberSchema],

  // Tracking flags
  participantsSubmitted: { type: Boolean, default: false },
  technicalSubmitted: { type: Boolean, default: false },

  submittedAt: { type: Date, default: Date.now },
  regId: { type: String, unique: true }, // School-level registration ID
});

// Compound unique index to prevent duplicate school registrations per event
registrationSchema.index({ eventId: 1, schoolCode: 1 }, { unique: true });

export const Registration = mongoose.model("Registration", registrationSchema);
