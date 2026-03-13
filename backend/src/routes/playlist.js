import { Router } from "express";
import { prisma } from "../prisma.js";
const r = Router();
r.post("/", async (req, res) => { try { const { id_salon, ajoute_par, url_video, titre } = req.body; if (!id_salon || !ajoute_par || !url_video || !titre) return res.status(400).json({ error: "champs requis" }); const item = await prisma.elementPlaylist.create({ data: { id_salon: Number(id_salon), ajoute_par: Number(ajoute_par), url_video, titre } }); res.status(201).json(item); } catch (e) { res.status(400).json({ error: e.message }); } });
r.get("/", async (req, res) => { const salonId = Number(req.query.salonId); if (!salonId) return res.status(400).json({ error: "salonId requis" }); res.json(await prisma.elementPlaylist.findMany({ where: { id_salon: salonId }, orderBy: { date_ajout: "desc" }, include: { utilisateur: { select: { id: true, pseudo: true } } } })); });
r.delete("/:id", async (req, res) => { try { await prisma.elementPlaylist.delete({ where: { id: Number(req.params.id) } }); res.json({ ok: true }); } catch (e) { res.status(404).json({ error: "Élément introuvable" }); } });
export default r;
