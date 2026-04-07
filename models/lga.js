import mongoose from "mongoose";
const Schema = mongoose.Schema;

const lgaSchema = new Schema({
  name: { type: String, required: true, unique: true },
  zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },
});

export const Lga = mongoose.model("Lga", lgaSchema);
