import { Router } from "express";
import { prisma } from "../prisma.js";

const r = Router();

// ➕ Créer un salon
r.post("/", async (req, res) => {
  try {
    const { nom, code_pin, createur_id } = req.body;
    const salon = await prisma.salon.create({
      data: {
        nom,
        code_pin,
        createur_id: Number(createur_id),
      },
    });
    res.status(201).json(salon);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 📋 Récupérer tous les salons
r.get("/", async (_req, res) => {
  const salons = await prisma.salon.findMany({
    include: {
      createur: { select: { id: true, pseudo: true } },
    },
  });
  res.json(salons);
});

// 🔍 Récupérer un salon précis
r.get("/:id", async (req, res) => {
  const salon = await prisma.salon.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      createur: { select: { id: true, pseudo: true } },
      messages: true,
      playlist: true,
      historiques: true,
    },
  });
  if (!salon) return res.status(404).json({ error: "Salon introuvable" });
  res.json(salon);
});

export default r;