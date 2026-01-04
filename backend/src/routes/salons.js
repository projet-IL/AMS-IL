import { Router } from "express";
import { prisma } from "../prisma.js";

const r = Router();

/**
 * ➕ Créer un salon (adapté à la DB pedago)
 * Body attendu (minimum) :
 * - nomSalon (string)
 * - pinRequis (boolean) (optionnel, default false)
 * - codePIN (number) (optionnel)
 */
r.post("/", async (req, res) => {
  try {
    const { nomSalon, pinRequis = false, codePIN = null } = req.body;

    if (!nomSalon || typeof nomSalon !== "string") {
      return res.status(400).json({ error: "nomSalon est requis (string)." });
    }

    const salon = await prisma.salon.create({
      data: {
        nomSalon,
        // si ta DB exige codeAcces, on le génère (8 chars)
        codeAcces: Math.random().toString(36).slice(2, 10),
        pinRequis: Boolean(pinRequis),
        codePIN: codePIN === null ? null : Number(codePIN),

        // Valeurs par défaut cohérentes avec tes données existantes
        position: 0,
        lecture: false,
        vitesse: 1,
      },
    });

    res.status(201).json(salon);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 📋 Récupérer tous les salons
r.get("/", async (_req, res) => {
  const salons = await prisma.salon.findMany();
  res.json(salons);
});

// 🔍 Récupérer un salon précis
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "id invalide" });

  const salon = await prisma.salon.findUnique({
    where: { id },
    // ⚠️ Si tu n'as pas ces relations dans ton schema.prisma, enlève-les
    include: {
      messages: true,
      playlist: true,
      historique: true, // attention : dans ton erreur précédente Prisma listait "historique" (pas "historiques")
      participants: true,
    },
  });

  if (!salon) return res.status(404).json({ error: "Salon introuvable" });
  res.json(salon);
});

export default r;
