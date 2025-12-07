import mongoose from "mongoose";
const Schema = mongoose.Schema;

const learnerSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "School", required: true },
  eccde: {
    eecde_male: Number,
    eccde_female: Number,
  },
  primary1: {
    pry1_male: Number,
    pry1_female: Number,
  },

  primary2: {
    pry2_male: Number,
    pry2_female: Number,
  },

  primary3: {
    pry3_male: Number,
    pry3_female: Number,
  },

  primary4: {
    pry4_male: Number,
    pry4_female: Number,
  },

  primary5: {
    pry5_male: Number,
    pry5_female: Number,
  },

  primary6: {
    pry6_male: Number,
    pry6_female: Number,
  },

  ubeJss1: {
    ubeJss1_male: Number,
    ubeJss1_female: Number,
  },

  ubeJss2: {
    ubeJss2_male: Number,
    ubeJss2_female: Number,
  },

  ubeJss3: {
    ubeJss3_male: Number,
    ubeJss3_female: Number,
  },

  capturedBy: String,
  dateCreated: { type: Date, default: Date.now },
});

export const Learners = mongoose.model("Learners", learnerSchema);
