import { Router } from "express";
import { prisma } from "../prisma.js";

const r = Router();

/**
 * POST /api/playlist
 * body: { id_salon, ajoute_par, url_video, titre }
 */
r.post("/", async (req, res) => {
  try {
    const { id_salon, ajoute_par, url_video, titre } = req.body;
    if (!id_salon || !ajoute_par || !url_video || !titre) {
      return res.status(400).json({ error: "id_salon, ajoute_par, url_video, titre requis" });
    }

    // (optionnel) vérifs FK rapides
    const [salon, user] = await Promise.all([
      prisma.salon.findUnique({ where: { id: Number(id_salon) } }),
      prisma.utilisateur.findUnique({ where: { id: Number(ajoute_par) } }),
    ]);
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const item = await prisma.elementPlaylist.create({
      data: {
        id_salon: Number(id_salon),
        ajoute_par: Number(ajoute_par),
        url_video,
        titre,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/playlist?salonId=1
 * Liste la playlist d’un salon (ordre: plus récent d’abord)
 */
r.get("/", async (req, res) => {
  const salonId = Number(req.query.salonId);
  if (!salonId) return res.status(400).json({ error: "salonId requis en query" });

  const items = await prisma.elementPlaylist.findMany({
    where: { id_salon: salonId },
    orderBy: { date_ajout: "desc" },
    include: { utilisateur: { select: { id: true, pseudo: true } } },
  });
  res.json(items);
});

/**
 * DELETE /api/playlist/:id
 * Supprime un élément de playlist par son id
 */
r.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.elementPlaylist.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: "Élément introuvable" });
  }
});

export default r;