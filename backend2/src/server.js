import "dotenv/config";
import express from "express";
import cors from "cors";
import salons from "./routes/salons.js";
import messages from "./routes/messages.js";
import playlist from "./routes/playlist.js";
import historique from "./routes/historique.js";




// 1) Créer l'app AVANT d'utiliser app.use
const app = express();

// 2) Middlewares
app.use(cors());
app.use(express.json());

// 3) Importer les routes (après avoir créé app, c'est ok)
import utilisateurs from "./routes/utilisateurs.js";

// 4) Monter les routes
app.use("/api/utilisateurs", utilisateurs);


app.use("/api/salons", salons);

app.use("/api/messages", messages);

app.use("/api/playlist", playlist);

app.use("/api/historique", historique);

// 5) Petit ping de santé
app.get("/ping", (_req, res) => res.json({ pong: true }));

// 6) Démarrer le serveur
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API démarrée sur ${PORT}`);
});
