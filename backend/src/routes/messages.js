import { Router } from "express";
import { prisma } from "../prisma.js";

const r = Router();

/**
 * POST /api/messages
 * body: { contenu, id_utilisateur, id_salon }
 */
r.post("/", async (req, res) => {
  try {
    const { contenu, id_utilisateur, id_salon } = req.body;

    // validations simples
    if (!contenu || !id_utilisateur || !id_salon) {
      return res.status(400).json({ error: "contenu, id_utilisateur, id_salon requis" });
    }

    // (optionnel) vérifier l'existence des FK
    const [user, salon] = await Promise.all([
      prisma.utilisateur.findUnique({ where: { id: Number(id_utilisateur) } }),
      prisma.salon.findUnique({ where: { id: Number(id_salon) } }),
    ]);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });

    const msg = await prisma.message.create({
      data: {
        contenu,
        id_utilisateur: Number(id_utilisateur),
        id_salon: Number(id_salon),
      },
    });
    res.status(201).json(msg);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/messages?salonId=1
 * Liste les messages d’un salon (du plus récent au plus ancien)
 */
r.get("/", async (req, res) => {
  const salonId = Number(req.query.salonId);
  if (!salonId) return res.status(400).json({ error: "salonId requis en query" });

  const messages = await prisma.message.findMany({
    where: { id_salon: salonId },
    orderBy: { date_heure: "desc" },
    include: { utilisateur: { select: { id: true, pseudo: true } } },
  });

  res.json(messages);
});

export default r;