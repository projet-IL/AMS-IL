import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";

import salons from "./routes/salons.js";
import utilisateurs from "./routes/utilisateurs.js";
import messages from "./routes/messages.js";
import playlist from "./routes/playlist.js";
import historique from "./routes/historique.js";
import notes from "./routes/notes.js";

import { prisma } from "./prisma.js";

const app = express();
const onlineByRoom = new Map();

app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/api/salons", salons);
app.use("/api/utilisateurs", utilisateurs);
app.use("/api/messages", messages);
app.use("/api/playlist", playlist);
app.use("/api/historique", historique);
app.use("/api/notes", notes);

app.get("/ping", (_req, res) => res.json({ pong: true }));

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || true, credentials: true },
});

const videoStates = {};
const whiteboardStates = {};
const drawPermissions = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // ═══ JOIN ROOM ═══
  socket.on("joinRoom", async ({ codeAcces, userId }) => {
    console.log("joinRoom", codeAcces, userId, socket.id);
    try {
      if (!codeAcces || !userId) { socket.emit("errorMessage", { error: "codeAcces et userId requis" }); return; }

      const salon = await prisma.salon.findUnique({ where: { code_acces: codeAcces }, select: { id: true } });
      if (!salon) { socket.emit("errorMessage", { error: "Salon introuvable" }); return; }

      const user = await prisma.utilisateur.findUnique({
        where: { id: Number(userId) },
        select: { id: true, pseudo: true, role: true, id_salon: true },
      });
      if (!user || user.id_salon !== salon.id) { socket.emit("errorMessage", { error: "Utilisateur invalide pour ce salon" }); return; }

      socket.join(codeAcces);
      socket.data.codeAcces = codeAcces;
      socket.data.userId = user.id;
      socket.data.pseudo = user.pseudo;
      socket.data.role = user.role;

      if (!onlineByRoom.has(codeAcces)) onlineByRoom.set(codeAcces, new Map());
      const roomMap = onlineByRoom.get(codeAcces);
      if (!roomMap.has(user.id)) roomMap.set(user.id, { userId: user.id, pseudo: user.pseudo, role: user.role, sockets: new Set() });
      roomMap.get(user.id).sockets.add(socket.id);

      io.to(codeAcces).emit("participantsOnline", {
        codeAcces,
        online: Array.from(roomMap.values()).map(x => ({ userId: x.userId, pseudo: x.pseudo, role: x.role })),
      });

      const playlistItems = await prisma.elementPlaylist.findMany({
        where: { id_salon: salon.id }, orderBy: { id: "asc" },
        select: { id: true, url_video: true, titre: true, ajoute_par: true, utilisateur: { select: { pseudo: true } } },
      });
      socket.emit("playlistSnapshot", {
        codeAcces,
        items: playlistItems.map(it => ({ id: it.id, url_video: it.url_video, titre: it.titre, ajoute_par: it.ajoute_par, pseudo: it.utilisateur?.pseudo || null })),
      });

      if (!videoStates[codeAcces]) videoStates[codeAcces] = { videoTime: 0, clockTime: Date.now(), isPlaying: false, playbackRate: 1, videoId: null };

      if (whiteboardStates[codeAcces]) socket.emit("whiteboardSnapshot", whiteboardStates[codeAcces]);

      const participants = await prisma.utilisateur.findMany({
        where: { id_salon: salon.id }, select: { id: true, pseudo: true, role: true }, orderBy: { id: "asc" },
      });
      io.to(codeAcces).emit("participantsUpdated", { codeAcces, participants });

      socket.emit("initialSync", videoStates[codeAcces]);
      socket.emit("joinedRoom", { codeAcces, userId: user.id, pseudo: user.pseudo, role: user.role });
    } catch (e) { socket.emit("errorMessage", { error: e.message }); }
  });

  // PERMIS DE DESSIN — seul le professeur peut envoyer ceci
  socket.on("grantDrawPermission", ({ codeAcces, targetUserId }) => {
    if (socket.data.role !== "prof") {
      console.log(`[Permission] Utilisateur ${socket.data.userId} n'est pas professeur, refusé`);
      return;
    }

    if (!codeAcces || !targetUserId) return;

    if (!drawPermissions.has(codeAcces)) {
      drawPermissions.set(codeAcces, new Set());
    }

    drawPermissions.get(codeAcces).add(Number(targetUserId));
    console.log(`[Permission] Utilisateur ${targetUserId} peut dessiner dans le salon ${codeAcces}`);

    io.to(codeAcces).emit("drawPermissionGranted", { userId: Number(targetUserId) });
  });

  // RETIRER LE PERMIS DE DESSIN — seulement le professeur
  socket.on("revokeDrawPermission", ({ codeAcces, targetUserId }) => {
    if (socket.data.role !== "prof") return;

    if (!codeAcces || !targetUserId) return;

    const permissions = drawPermissions.get(codeAcces);
    if (permissions) {
      permissions.delete(Number(targetUserId));
      console.log(`[Permission] Utilisateur ${targetUserId} ne peut PLUS dessiner dans le salon ${codeAcces}`);
    }

    io.to(codeAcces).emit("drawPermissionRevoked", { userId: Number(targetUserId) });
  });

  // ═══ CHAT ═══
  socket.on("chatMessage", async ({ codeAcces, userId, contenu }) => {
    try {
      if (!codeAcces || !userId || !contenu) return;
      const salon = await prisma.salon.findUnique({ where: { code_acces: codeAcces }, select: { id: true } });
      if (!salon) return;
      const user = await prisma.utilisateur.findUnique({ where: { id: Number(userId) }, select: { id: true, pseudo: true, role: true, id_salon: true } });
      if (!user || user.id_salon !== salon.id) return;

      const msg = await prisma.message.create({
        data: { contenu, id_salon: salon.id, id_utilisateur: Number(userId) },
        select: { id: true, contenu: true, id_salon: true, id_utilisateur: true, date_heure: true },
      });

      io.to(codeAcces).emit("chatMessageCreated", { ...msg, pseudo: user.pseudo, role: user.role });
    } catch (e) { socket.emit("errorMessage", { error: e.message }); }
  });

  // ═══ NOTES ═══
  socket.on("noteAdded", ({ codeAcces, note }) => { if (codeAcces && note) socket.to(codeAcces).emit("noteAdded", { note }); });
  socket.on("noteDeleted", ({ codeAcces, noteId }) => { if (codeAcces && noteId) socket.to(codeAcces).emit("noteDeleted", { noteId }); });

  // ═══ WHITEBOARD ═══
  socket.on("whiteboardDraw", ({ codeAcces, stroke }) => {
    if (!codeAcces || !stroke) return;

    const hasPermission = socket.data.role === "prof" ||
                          (drawPermissions.get(codeAcces)?.has(socket.data.userId));

    if (!hasPermission) {
      console.log(`[Permission] Utilisateur ${socket.data.userId} non autorisé à dessiner`);
      return;
    }

    if (!whiteboardStates[codeAcces]) whiteboardStates[codeAcces] = [];
    whiteboardStates[codeAcces].push(stroke);

    socket.to(codeAcces).emit("whiteboardDraw", stroke);
  });
  socket.on("whiteboardClear", ({ codeAcces }) => {
    if (!codeAcces) return;
    if (socket.data.role !== "prof") return;
    whiteboardStates[codeAcces] = [];
    io.to(codeAcces).emit("whiteboardClear");
  });
  socket.on("whiteboardUndo", ({ codeAcces }) => {
    if (!codeAcces || socket.data.role !== "prof") return;
    const strokes = whiteboardStates[codeAcces];
    if (strokes && strokes.length > 0) { strokes.pop(); io.to(codeAcces).emit("whiteboardSnapshot", strokes); }
  });

  // ═══ PLAYLIST ═══
  socket.on("playlistAdd", async ({ codeAcces, userId, url_video, titre }) => {
    try {
      if (!codeAcces || !userId || !url_video || !titre) return;
      const salon = await prisma.salon.findUnique({ where: { code_acces: codeAcces }, select: { id: true } });
      if (!salon) return;
      const already = await prisma.elementPlaylist.findFirst({ where: { id_salon: salon.id, url_video }, select: { id: true } });
      if (already) { socket.emit("playlistDuplicate", { url_video }); return; }
      const item = await prisma.elementPlaylist.create({
        data: { id_salon: salon.id, ajoute_par: Number(userId), url_video, titre },
        select: { id: true, url_video: true, titre: true, ajoute_par: true },
      });
      const user = await prisma.utilisateur.findUnique({ where: { id: Number(userId) }, select: { pseudo: true } });
      io.to(codeAcces).emit("playlistItemAdded", { ...item, pseudo: user?.pseudo || null });
    } catch (e) { socket.emit("errorMessage", { error: e.message }); }
  });

  socket.on("playlistRemove", async ({ codeAcces, itemId }) => {
    try {
      if (!codeAcces || !itemId) return;
      const salon = await prisma.salon.findUnique({ where: { code_acces: codeAcces }, select: { id: true } });
      if (!salon) return;
      const item = await prisma.elementPlaylist.findUnique({ where: { id: Number(itemId) }, select: { id: true, id_salon: true } });
      if (!item || item.id_salon !== salon.id) return;
      await prisma.elementPlaylist.delete({ where: { id: Number(itemId) } });
      io.to(codeAcces).emit("playlistItemRemoved", { id: Number(itemId) });
    } catch (e) { socket.emit("errorMessage", { error: e.message }); }
  });

  // ═══ SYNCHRO VIDEO ═══
  socket.on("play", ({ codeAcces }) => { const s = videoStates[codeAcces]; if (!s) return; s.isPlaying = true; s.clockTime = Date.now(); socket.to(codeAcces).emit("play"); });
  socket.on("pause", ({ codeAcces }) => { const s = videoStates[codeAcces]; if (!s) return; s.isPlaying = false; socket.to(codeAcces).emit("pause"); });
  socket.on("syncAction", ({ codeAcces, videoTime, clockTime, playbackRate }) => { const s = videoStates[codeAcces]; if (!s) return; s.videoTime = videoTime; s.clockTime = clockTime; if (playbackRate) s.playbackRate = playbackRate; socket.to(codeAcces).emit("syncAction", { videoTime, clockTime, playbackRate }); });
  socket.on("changeSpeed", ({ codeAcces, speed }) => { const s = videoStates[codeAcces]; if (!s) return; s.playbackRate = speed; socket.to(codeAcces).emit("changeSpeed", speed); });
  socket.on("videoTime", ({ codeAcces, videoTime, clockTime, playbackRate }) => { const s = videoStates[codeAcces]; if (!s) return; s.videoTime = videoTime; s.clockTime = clockTime; if (playbackRate) s.playbackRate = playbackRate; });

  socket.on("changeVideo", async ({ codeAcces, videoId }) => {
    const s = videoStates[codeAcces]; if (!s) return;
    const salon = await prisma.salon.findUnique({ where: { code_acces: codeAcces }, select: { id: true } });
    if (!salon) return;
    if (s.videoId && s.videoId !== videoId) {
      await prisma.historique.create({ data: { id_salon: salon.id, url_video: `https://youtube.com/watch?v=${s.videoId}` } });
    }
    s.videoId = videoId; s.videoTime = 0; s.clockTime = Date.now(); s.isPlaying = true;
    io.to(codeAcces).emit("changeVideo", videoId);
  });

  // ═══ DISCONNECT ═══
  socket.on("disconnect", () => {
    const codeAcces = socket.data?.codeAcces;
    const uid = socket.data?.userId;
    if (!codeAcces || !uid) return;
    const roomMap = onlineByRoom.get(codeAcces);
    if (!roomMap) return;
    const entry = roomMap.get(uid);
    if (!entry) return;
    entry.sockets.delete(socket.id);
    if (entry.sockets.size === 0) roomMap.delete(uid);
    if (roomMap.size === 0) onlineByRoom.delete(codeAcces);
    else {
      io.to(codeAcces).emit("participantsOnline", {
        codeAcces,
        online: Array.from(roomMap.values()).map(x => ({ userId: x.userId, pseudo: x.pseudo, role: x.role })),
      });
    }
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`API + Socket.IO démarrés sur 0.0.0.0:${PORT}`);
});
