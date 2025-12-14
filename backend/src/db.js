import mongoose from "mongoose";

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { dbName: "w2g" });
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ Échec connexion MongoDB :", err.message);
    // NE PAS throw — on laisse l'API tourner quand même
  }
}