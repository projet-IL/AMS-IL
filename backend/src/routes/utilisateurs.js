import { Router } from "express";
import { prisma } from "../prisma.js";
const r = Router();
r.post("/", async (req, res) => { try { const { pseudo } = req.body; const user = await prisma.utilisateur.create({ data: { pseudo } }); res.status(201).json(user); } catch (e) { res.status(400).json({ error: e.message }); } });
r.get("/", async (_req, res) => { res.json(await prisma.utilisateur.findMany({ orderBy: { createdAt: "desc" } })); });
export default r;
