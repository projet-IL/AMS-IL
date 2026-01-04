import mongoose from "mongoose";

const UtilisateurSchema = new mongoose.Schema({
  pseudo: { type: String, required: true, trim: true, unique: true }
}, { timestamps: true });

export default mongoose.model("Utilisateur", UtilisateurSchema, "utilisateurs");
