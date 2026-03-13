import { Router } from "express";
import { prisma } from "../prisma.js";
const r = Router();
r.post("/", async (req, res) => { try { const { contenu, id_utilisateur, id_salon } = req.body; if (!contenu || !id_utilisateur || !id_salon) return res.status(400).json({ error: "contenu, id_utilisateur, id_salon requis" }); const msg = await prisma.message.create({ data: { contenu, id_utilisateur: Number(id_utilisateur), id_salon: Number(id_salon) } }); res.status(201).json(msg); } catch (e) { res.status(400).json({ error: e.message }); } });
r.get("/", async (req, res) => { const salonId = Number(req.query.salonId); if (!salonId) return res.status(400).json({ error: "salonId requis" }); const messages = await prisma.message.findMany({ where: { id_salon: salonId }, orderBy: { date_heure: "asc" }, include: { utilisateur: { select: { id: true, pseudo: true, role: true } } } }); res.json(messages); });
export default r;
