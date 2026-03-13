import { Router } from "express";
import { prisma } from "../prisma.js";
const r = Router();
r.post("/", async (req, res) => { try { const { id_salon, url_video } = req.body; if (!id_salon || !url_video) return res.status(400).json({ error: "id_salon et url_video requis" }); const entry = await prisma.historique.create({ data: { id_salon: Number(id_salon), url_video } }); res.status(201).json(entry); } catch (e) { res.status(400).json({ error: e.message }); } });
r.get("/", async (req, res) => { const salonId = Number(req.query.salonId); if (!salonId) return res.status(400).json({ error: "salonId requis" }); res.json(await prisma.historique.findMany({ where: { id_salon: salonId }, orderBy: { date_visionnage: "desc" } })); });
export default r;
