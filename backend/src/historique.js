import { Router } from "express";
import { prisma } from "../prisma.js";

const r = Router();

/**
 * POST /api/historique
 * body: { id_salon, url_video }
 */
r.post("/", async (req, res) => {
  try {
    const { id_salon, url_video } = req.body;
    if (!id_salon || !url_video) {
      return res.status(400).json({ error: "id_salon et url_video requis" });
    }

    // Vérifie que le salon existe
    const salon = await prisma.salon.findUnique({ where: { id: Number(id_salon) } });
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });

    const entry = await prisma.historique.create({
      data: {
        id_salon: Number(id_salon),
        url_video,
      },
    });
    res.status(201).json(entry);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/historique?salonId=1
 * Liste l’historique des vidéos d’un salon
 */
r.get("/", async (req, res) => {
  const salonId = Number(req.query.salonId);
  if (!salonId) return res.status(400).json({ error: "salonId requis en query" });

  const entries = await prisma.historique.findMany({
    where: { id_salon: salonId },
    orderBy: { date_visionnage: "desc" },
  });
  res.json(entries);
});

export default r;