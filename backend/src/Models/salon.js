import mongoose from "mongoose";

const SalonSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  code_PIN: { type: String, trim: true, index: true },
  createur_id: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true }
}, { timestamps: true });

export default mongoose.model("Salon", SalonSchema, "salons");
