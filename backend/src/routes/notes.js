import { Router } from "express";
import { prisma } from "../prisma.js";
const r = Router();

r.post("/", async (req, res) => {
  try {
    const { contenu, timestamp_video, video_id, id_utilisateur, hashtags } = req.body;
    if (!contenu || timestamp_video === undefined || !id_utilisateur) return res.status(400).json({ error: "contenu, timestamp_video et id_utilisateur requis" });
    const user = await prisma.utilisateur.findUnique({ where: { id: Number(id_utilisateur) } });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    const note = await prisma.note.create({ data: { contenu, timestamp_video: Number(timestamp_video), video_id: video_id || null, id_utilisateur: Number(id_utilisateur) } });
    if (hashtags && Array.isArray(hashtags) && hashtags.length > 0) {
      for (const tag of hashtags) {
        const nom = tag.trim().toLowerCase().replace(/^#/, "");
        if (!nom) continue;
        const hashtag = await prisma.hashtag.upsert({ where: { nom }, update: {}, create: { nom } });
        await prisma.noteHashtag.create({ data: { id_note: note.id, id_hashtag: hashtag.id } });
      }
    }
    const noteComplete = await prisma.note.findUnique({ where: { id: note.id }, include: { hashtags: { include: { hashtag: true } }, utilisateur: { select: { id: true, pseudo: true } } } });
    res.status(201).json(noteComplete);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.get("/", async (req, res) => {
  try {
    const userId = Number(req.query.userId); const videoId = req.query.videoId || null; const hashtagFilter = req.query.hashtag || null;
    if (!userId) return res.status(400).json({ error: "userId requis" });
    const where = { id_utilisateur: userId };
    if (videoId) where.video_id = videoId;
    if (hashtagFilter) where.hashtags = { some: { hashtag: { nom: hashtagFilter.toLowerCase() } } };
    const notes = await prisma.note.findMany({ where, orderBy: { timestamp_video: "asc" }, include: { hashtags: { include: { hashtag: true } }, utilisateur: { select: { id: true, pseudo: true } } } });
    res.json(notes);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.get("/salon/:codeAcces", async (req, res) => {
  try {
    const salon = await prisma.salon.findUnique({ where: { code_acces: req.params.codeAcces }, select: { id: true } });
    if (!salon) return res.status(404).json({ error: "Salon introuvable" });
    const videoId = req.query.videoId || null;
    const where = { utilisateur: { id_salon: salon.id } };
    if (videoId) where.video_id = videoId;
    const notes = await prisma.note.findMany({ where, orderBy: { timestamp_video: "asc" }, include: { hashtags: { include: { hashtag: true } }, utilisateur: { select: { id: true, pseudo: true, role: true } } } });
    res.json(notes);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.delete("/:id", async (req, res) => {
  try { await prisma.note.delete({ where: { id: Number(req.params.id) } }); res.json({ ok: true }); }
  catch (e) { res.status(404).json({ error: "Note introuvable" }); }
});

r.get("/export", async (req, res) => {
  try {
    const userId = Number(req.query.userId); const videoId = req.query.videoId || null;
    if (!userId) return res.status(400).json({ error: "userId requis" });
    const where = { id_utilisateur: userId }; if (videoId) where.video_id = videoId;
    const notes = await prisma.note.findMany({ where, orderBy: { timestamp_video: "asc" }, include: { hashtags: { include: { hashtag: true } }, utilisateur: { select: { pseudo: true } } } });
    const lines = notes.map(n => { const m = Math.floor(n.timestamp_video / 60); const s = Math.floor(n.timestamp_video % 60).toString().padStart(2, "0"); const tags = n.hashtags.map(h => `#${h.hashtag.nom}`).join(" "); return `[${m}:${s}] ${n.contenu}${tags ? "  " + tags : ""}`; });
    const text = [`Notes de ${notes[0]?.utilisateur?.pseudo || "utilisateur"}`, "=".repeat(50), "", ...lines].join("\n");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="notes-${videoId || "all"}.txt"`);
    res.send(text);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
