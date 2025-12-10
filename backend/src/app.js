// src/app.js
require("dotenv").config();
console.log("DATABASE_URL =", process.env.DATABASE_URL);

const express = require("express");
const cors = require("cors");

const app = express();

const salonRoutes = require("./routes/salonRoutes");

// middlewares
app.use(cors());
app.use(express.json());

// route: sante du backend
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// toutes les routes de salons commencent par /api/salons
app.use("/api/salons", salonRoutes);

// demarrage serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend AMS IL écoute sur http://localhost:${PORT}`);
});
