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

import { prisma } from "./prisma.js";

const app = express();
const onlineByRoom = new Map(); // key: codeAcces -> Map(userId -> { userId, pseudo, sockets: Set(socketId) })

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

// Routes API
app.use("/api/salons", salons);
app.use("/api/utilisateurs", utilisateurs);
app.use("/api/messages", messages);
app.use("/api/playlist", playlist);
app.use("/api/historique", historique);

// Ping
app.get("/ping", (_req, res) => res.json({ pong: true }));

// HTTP server + Socket.IO
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  },
});

/**
 * État vidéo par salon (clé = codeAcces)
 */
const videoStates = {}; // { [codeAcces]: { videoTime, clockTime, isPlaying, playbackRate } }

// Socket events (base d’assemblage)
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // JOIN ROOM + PARTICIPANTS + INITIAL SYNC VIDEO
  // payload: { codeAcces }
  socket.on("joinRoom", async ({ codeAcces, userId }) => {
    console.log("joinRoom", codeAcces, userId, socket.id);
    try {
      if (!codeAcces || !userId) {
        socket.emit("errorMessage", { error: "codeAcces et userId requis" });
        return;
      }

      const salon = await prisma.salon.findUnique({
        where: { code_acces: codeAcces },
        select: { id: true },
      });

      if (!salon) {
        socket.emit("errorMessage", { error: "Salon introuvable" });
        return;
      }

      // Vérifier que l'utilisateur existe ET qu'il appartient à ce salon
      const user = await prisma.utilisateur.findUnique({
        where: { id: Number(userId) },
        select: { id: true, pseudo: true, id_salon: true },
      });

      if (!user || user.id_salon !== salon.id) {
        socket.emit("errorMessage", { error: "Utilisateur invalide pour ce salon" });
        return;
      }

      socket.join(codeAcces);

      socket.data.codeAcces = codeAcces;
      socket.data.userId = user.id;
      socket.data.pseudo = user.pseudo;
      if (!onlineByRoom.has(codeAcces)) onlineByRoom.set(codeAcces, new Map());
      const roomMap = onlineByRoom.get(codeAcces);

      if (!roomMap.has(user.id)) {
        roomMap.set(user.id, { userId: user.id, pseudo: user.pseudo, sockets: new Set() });
      }
      roomMap.get(user.id).sockets.add(socket.id);

      //  broadcast liste connectés
      io.to(codeAcces).emit("participantsOnline", {
        codeAcces,
        online: Array.from(roomMap.values()).map(x => ({ userId: x.userId, pseudo: x.pseudo }))
      });

      // envoyer la playlist existante au nouveau user 
      const playlistItems = await prisma.elementPlaylist.findMany({
        where: { id_salon: salon.id },
        orderBy: { id: "asc" },
        select: { id: true, url_video: true, titre: true, ajoute_par: true, utilisateur: { select: { pseudo: true } }, },
      });
      socket.emit("playlistSnapshot", {
        codeAcces,
        items: playlistItems.map(it => ({
          id: it.id,
          url_video: it.url_video,
          titre: it.titre,
          ajoute_par: it.ajoute_par,
          pseudo: it.utilisateur?.pseudo || null, // ✅
        })),
      });
      
      //  init state vidéo si salon pas encore initialisé
      if (!videoStates[codeAcces]) {
        videoStates[codeAcces] = {
          videoTime: 0,
          clockTime: Date.now(),
          isPlaying: false,
          playbackRate: 1,
          videoId: null, // optionnel
        };
      }

      // Récup participants depuis DB
      const participants = await prisma.utilisateur.findMany({
        where: { id_salon: salon.id },
        select: { id: true, pseudo: true },
        orderBy: { id: "asc" },
      });

      io.to(codeAcces).emit("participantsUpdated", {
        codeAcces,
        participants,
      });

      //  envoyer l'état vidéo actuel au nouveau user (sync initial)
      socket.emit("initialSync", videoStates[codeAcces]);
      socket.emit("joinedRoom", { codeAcces, userId: user.id, pseudo: user.pseudo });
    } catch (e) {
      socket.emit("errorMessage", { error: e.message });
    }
  });


  // CHAT temps réel + persistance DB
  // payload: { codeAcces, userId, contenu }
  socket.on("chatMessage", async ({ codeAcces, userId, contenu }) => {
    try {
      if (!codeAcces || !userId || !contenu) return;

      const salon = await prisma.salon.findUnique({
        where: { code_acces: codeAcces },
        select: { id: true },
      });

      if (!salon) {
        socket.emit("errorMessage", { error: "Salon introuvable" });
        return;
      }

      // récup pseudo
      const user = await prisma.utilisateur.findUnique({
        where: { id: Number(userId) },
        select: { id: true, pseudo: true, id_salon: true },
      });

      // user doit appartenir au salon
      if (!user || user.id_salon !== salon.id) {
        socket.emit("errorMessage", { error: "Utilisateur invalide pour ce salon" });
        return;
      }

      const msg = await prisma.message.create({
        data: {
          contenu,
          id_salon: salon.id,
          id_utilisateur: Number(userId),
        },
        select: {
          id: true,
          contenu: true,
          id_salon: true,
          id_utilisateur: true,
          date_heure: true, 
        },
      });

      // broadcast avec pseudo
      io.to(codeAcces).emit("chatMessageCreated", {
        ...msg,
        pseudo: user.pseudo,
      });
    } catch (e) {
      socket.emit("errorMessage", { error: e.message });
    }
  });

  // PLAYLIST ADD temps réel + persistance DB
  // payload: { codeAcces, userId, url_video, titre }
  socket.on("playlistAdd", async ({ codeAcces, userId, url_video, titre }) => {
    try {
      if (!codeAcces || !userId || !url_video || !titre) return;

      const salon = await prisma.salon.findUnique({
        where: { code_acces: codeAcces },
        select: { id: true },
      });

      if (!salon) {
        socket.emit("errorMessage", { error: "Salon introuvable" });
        return;
      }

      // ANTI-DOUBLON ICI (avant create)
      const already = await prisma.elementPlaylist.findFirst({
        where: { id_salon: salon.id, url_video },
        select: { id: true },
      });

      if (already) {
        // option: prévenir uniquement celui qui a tenté
        socket.emit("playlistDuplicate", { url_video });
        return;
      }

      // Création de l’élément playlist
      const item = await prisma.elementPlaylist.create({
        data: {
          id_salon: salon.id,
          ajoute_par: Number(userId),
          url_video,
          titre,
        },
        select: { id: true, url_video: true, titre: true, ajoute_par: true }, 
      });

      // Récupération du pseudo de l’utilisateur
      const user = await prisma.utilisateur.findUnique({
        where: { id: Number(userId) },
        select: { pseudo: true },
      });

      // Broadcast avec pseudo inclus
      io.to(codeAcces).emit("playlistItemAdded", {
        ...item,
        pseudo: user?.pseudo || null,
      });

    } catch (e) {
      socket.emit("errorMessage", { error: e.message });
    }
  });

  // PLAYLIST REMOVE temps réel + suppression DB
  // payload: { codeAcces, itemId }
  socket.on("playlistRemove", async ({ codeAcces, itemId }) => {
    try {
      if (!codeAcces || !itemId) return;

      const salon = await prisma.salon.findUnique({
        where: { code_acces: codeAcces },
        select: { id: true },
      });
      if (!salon) {
        socket.emit("errorMessage", { error: "Salon introuvable" });
        return;
      }

      const item = await prisma.elementPlaylist.findUnique({
        where: { id: Number(itemId) },
        select: { id: true, id_salon: true },
      });

      if (!item || item.id_salon !== salon.id) {
        socket.emit("errorMessage", { error: "Item introuvable dans ce salon" });
        return;
      }

      await prisma.elementPlaylist.delete({
        where: { id: Number(itemId) },
      });

      io.to(codeAcces).emit("playlistItemRemoved", { id: Number(itemId) });
    } catch (e) {
      socket.emit("errorMessage", { error: e.message });
    }
  });

  /* !!!!!!!!!!!!!!! SYNCHRO VIDEO !!!!!!!!!!!!!!! */
  // Tous les payloads incluent maintenant codeAcces pour permettre aux différents salons d'avoir leur propre synchro

  socket.on("play", ({ codeAcces }) => {
    const state = videoStates[codeAcces];
    if (!state) return;
    state.isPlaying = true;
    state.clockTime = Date.now(); // Enregistrer l'horaire du play
    socket.to(codeAcces).emit("play");
  });

  socket.on("pause", ({ codeAcces }) => {
    const state = videoStates[codeAcces];
    if (!state) return;
    state.isPlaying = false;
    socket.to(codeAcces).emit("pause");
  });


  socket.on("syncAction", ({ codeAcces, videoTime, clockTime, playbackRate }) => {
    const state = videoStates[codeAcces];
    if (!state) return;
    state.videoTime = videoTime;
    state.clockTime = clockTime;
    if (playbackRate) state.playbackRate = playbackRate;
    socket.to(codeAcces).emit("syncAction", { videoTime, clockTime, playbackRate });
  });

  socket.on("changeSpeed", ({ codeAcces, speed }) => {
    const state = videoStates[codeAcces];
    if (!state) return;
    state.playbackRate = speed;
    socket.to(codeAcces).emit("changeSpeed", speed);
  });

  // Mise à jour de l'état de la vid pour les new users
  socket.on("videoTime", ({ codeAcces, videoTime, clockTime, playbackRate }) => {
    const state = videoStates[codeAcces];
    if (!state) return;
    state.videoTime = videoTime;
    state.clockTime = clockTime;
    if (playbackRate) state.playbackRate = playbackRate;
  });

  socket.on("changeVideo", async ({ codeAcces, videoId }) => {
    const state = videoStates[codeAcces];
    if (!state) return;    
    const salon = await prisma.salon.findUnique({ // retrouver salon id
      where: { code_acces: codeAcces },
      select: { id: true },
    });
    if (!salon) return;
    if (state.videoId && state.videoId !== videoId) { // si on avait déjà une vidéo -> on la pousse en historique
      await prisma.historique.create({
        data: {
          id_salon: salon.id,
          url_video: `https://youtube.com/watch?v=${state.videoId}`,
        },
      });
    }

    // puis state reset
    state.videoId = videoId;
    state.videoTime = 0;
    state.clockTime = Date.now();
    state.isPlaying = true;
    io.to(codeAcces).emit("changeVideo", videoId);
  });


  socket.on("disconnect", () => {
    const codeAcces = socket.data?.codeAcces;
    const userId = socket.data?.userId;
    if (!codeAcces || !userId) return;
    const roomMap = onlineByRoom.get(codeAcces);
    if (!roomMap) return;
    const entry = roomMap.get(userId);
    if (!entry) return;
    entry.sockets.delete(socket.id);
    if (entry.sockets.size === 0) roomMap.delete(userId);
    if (roomMap.size === 0) onlineByRoom.delete(codeAcces);
    else {
      io.to(codeAcces).emit("participantsOnline", {
        codeAcces,
        online: Array.from(roomMap.values()).map(x => ({ userId: x.userId, pseudo: x.pseudo }))
      });
    }
    console.log("Socket disconnected:", socket.id);
  });

});

const PORT = process.env.PORT || 4000; //Utilisation du port 4000 http accessible sur pedago
httpServer.listen(PORT, () => {
  console.log(`API + Socket.IO démarrés sur ${PORT}`);
});
