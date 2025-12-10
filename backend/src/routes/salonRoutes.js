const express = require("express");
const router = express.Router();
const salonController = require("../controllers/salonController");

// --- Salons de base ---
router.get("/", salonController.getAllSalons);
router.post("/", salonController.createSalon);
router.get("/:codeAcces", salonController.getSalonByCode);

// --- Rejoindre un salon avec PIN ---
router.post("/:codeAcces/join", salonController.joinSalon);

// --- Quitter un salon ---
router.post("/:codeAcces/leave", salonController.leaveSalon);

// --- Récupérer l’état complet (salon + participants + playlist + historique) ---
router.get("/:codeAcces/state", salonController.getSalonState);

// --- Mettre à jour l’état vidéo du salon (position, lecture, vitesse) ---
router.patch("/:codeAcces/state", salonController.updateSalonState);

// --- Supprimer un salon ---
router.delete("/:codeAcces", salonController.deleteSalon);

module.exports = router;
