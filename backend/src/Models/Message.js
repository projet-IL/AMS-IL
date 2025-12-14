import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  contenu: { type: String, required: true, trim: true },
  date_heure: { type: Date, default: Date.now },
  id_utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  id_salon: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true }
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema, "messages");
