const salonService = require("../services/salonService");

exports.getAllSalons = async (req, res) => {
  try {
    const salons = await salonService.getAllSalons();
    res.json(salons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des salons" });
  }
};

exports.createSalon = async (req, res) => {
  try {
    const { nomSalon, pinRequis, codePIN } = req.body;
    const salon = await salonService.createSalon({ nomSalon, pinRequis, codePIN });
    res.status(201).json(salon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du salon" });
  }
};

exports.getSalonByCode = async (req, res) => {
  try {
    const { codeAcces } = req.params;
    const salon = await salonService.getSalonByCode(codeAcces);
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });
    res.json(salon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération du salon" });
  }
};

exports.joinSalon = async (req, res) => {
  try {
    const { codeAcces } = req.params;
    const { pseudo, codePIN } = req.body;
    const result = await salonService.joinSalon({ codeAcces, pseudo, codePIN });
    res.json(result); // { salon, participant, participants }
  } catch (err) {
    console.error(err);
    if (err.name === "PIN_ERROR") {
      return res.status(403).json({ error: "Code PIN incorrect" });
    }
    if (err.name === "NOT_FOUND") {
      return res.status(404).json({ error: "Salon introuvable" });
    }
    res.status(500).json({ error: "Erreur lors de la connexion au salon" });
  }
};

/* QUITTER UN SALON */
exports.leaveSalon = async (req, res) => {
  try {
    const { codeAcces } = req.params;
    const { participantId } = req.body;
    const result = await salonService.leaveSalon({ codeAcces, participantId });
    res.json(result); // ex: { success: true }
  } catch (err) {
    console.error(err);
    if (err.name === "NOT_FOUND") {
      return res.status(404).json({ error: "Salon ou participant introuvable" });
    }
    res.status(500).json({ error: "Erreur lors de la sortie du salon" });
  }
};

/* RÉCUPÉRER L’ÉTAT COMPLET */
exports.getSalonState = async (req, res) => {
  try {
    const { codeAcces } = req.params;
    const state = await salonService.getSalonState(codeAcces);
    if (!state) return res.status(404).json({ error: "Salon introuvable" });
    res.json(state);
    // { salon, participants, playlist, historique }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération de l'état du salon" });
  }
};

/* METTRE À JOUR L’ÉTAT VIDÉO  */
exports.updateSalonState = async (req, res) => {
  try {
    const { codeAcces } = req.params;
    const { position, lecture, vitesse } = req.body;
    const salon = await salonService.updateSalonState(codeAcces, { position, lecture, vitesse });
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });
    res.json(salon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'état du salon" });
  }
};

/* SUPPRIMER UN SALON  */
exports.deleteSalon = async (req, res) => {
  try {
    const { codeAcces } = req.params;
    await salonService.deleteSalon(codeAcces);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    if (err.name === "NOT_FOUND") {
      return res.status(404).json({ error: "Salon introuvable" });
    }
    res.status(500).json({ error: "Erreur lors de la suppression du salon" });
  }
};
