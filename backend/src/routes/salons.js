import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../prisma.js";

const r = Router();

function genCodeAcces() {
  return crypto.randomBytes(6).toString("hex"); // 12 chars
}

// ✅ Créer un salon
// body: { nom, pseudo, code_pin? }
r.post("/", async (req, res) => {
  try {
    const { nom, pseudo, code_pin } = req.body;
    if (!nom || !pseudo) {
      return res.status(400).json({ error: "nom et pseudo requis" });
    }

    const code_acces = genCodeAcces();

    const salon = await prisma.salon.create({
      data: { nom, code_acces, code_pin: code_pin || null },
    });

    //  crée l'utilisateur hôte
    const utilisateur = await prisma.utilisateur.create({
      data: {
        pseudo,
        id_salon: salon.id,
      },
    });

    const shareUrl =
      (process.env.FRONTEND_URL || "http://localhost:3000") +
      `/video.html?code=${salon.code_acces}`;

    res.status(201).json({
      salon: {
        id: salon.id,
        nom: salon.nom,
        code_acces: salon.code_acces,
        has_pin: !!salon.code_pin,
      },
      utilisateur: { id: utilisateur.id, pseudo: utilisateur.pseudo },
      shareUrl,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// ✅ Lister salons
r.get("/", async (_req, res) => {
  const salons = await prisma.salon.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(salons);
});

// ✅ Récupérer un salon par code_acces (lien personnalisé)
r.get("/:codeAcces", async (req, res) => {
  const salon = await prisma.salon.findUnique({
    where: { code_acces: req.params.codeAcces },
    include: {
      utilisateurs: { select: { id: true, pseudo: true, createdAt: true } },
      messages: { orderBy: { date_heure: "asc" } },
      playlist: { orderBy: { date_ajout: "asc" } },
      historiques: { orderBy: { date_visionnage: "desc" } },
    },
  });

  if (!salon) return res.status(404).json({ error: "Salon introuvable" });
  res.json(salon);
});

// ✅ Rejoindre un salon (pseudo temporaire + vérif PIN)
// body: { pseudo, code_pin? }
// Rejoindre un salon (pseudo + PIN)
r.post("/:codeAcces/join", async (req, res) => {
  try {
    const { pseudo, code_pin } = req.body;
    if (!pseudo) return res.status(400).json({ error: "pseudo requis" });

    const salon = await prisma.salon.findUnique({
      where: { code_acces: req.params.codeAcces },
    });

    if (!salon) return res.status(404).json({ error: "Salon introuvable" });

    // Vérif PIN si salon protégé
    if (salon.code_pin && salon.code_pin !== code_pin) {
      return res.status(403).json({ error: "PIN invalide" });
    }

    const utilisateur = await prisma.utilisateur.create({
      data: {
        pseudo,
        id_salon: salon.id,
      },
    });

    return res.status(201).json({ salon, utilisateur });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


// ✅ Quitter un salon (supprime l’utilisateur)
// body: { utilisateurId }
r.post("/:codeAcces/leave", async (req, res) => {
  try {
    const { utilisateurId } = req.body;
    if (!utilisateurId) return res.status(400).json({ error: "utilisateurId requis" });

    await prisma.utilisateur.delete({ where: { id: Number(utilisateurId) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ✅ Supprimer un salon (cascade : utilisateurs/messages/playlist/historique)
r.delete("/:codeAcces", async (req, res) => {
  try {
    const salon = await prisma.salon.findUnique({
      where: { code_acces: req.params.codeAcces },
    });
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });

    await prisma.salon.delete({ where: { id: salon.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default r;
