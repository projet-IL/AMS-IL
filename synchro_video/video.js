import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Autorise tous les domaines
        methods: ["GET", "POST"]
    }
});

const __dirname = dirname(fileURLToPath(import.meta.url));

// État global pour la sync des new users
let videoState = {
    videoTime: 0,
    clockTime: Date.now(),
    isPlaying: false,
    playbackRate: 1
};

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'video.html'));
});

io.on('connection', (socket) => {
    console.log("Un utilisateur s'est connecté");

    socket.emit('initialSync', videoState); // Envoi de l'état de la vidéo aux new users

    socket.on('play', () => {
        videoState.isPlaying = true;
        videoState.clockTime = Date.now(); // Enregistrer l'horaire du play
        socket.broadcast.emit('play');
    });

    socket.on('pause', () => {
        videoState.isPlaying = false;
        socket.broadcast.emit('pause');
    });

    socket.on('syncAction', (data) => {
        videoState.videoTime = data.videoTime;
        videoState.clockTime = data.clockTime;
        videoState.isPlaying = true; 
        socket.broadcast.emit('syncAction', data);
    });

    socket.on('changeSpeed', (speed) => {
        videoState.playbackRate = speed;
        socket.broadcast.emit('changeSpeed', speed);
    });
    
    socket.on('videoTime', (data) => { // Mise à jour de l'état de la vid pour les new users
        videoState.videoTime = data.videoTime;
        videoState.clockTime = data.clockTime;
        videoState.playbackRate = data.playbackRate || videoState.playbackRate;
    });

    socket.on('disconnect', () => {
        console.log("Un utilisateur s'est déconnecté");
    });

    socket.on('changeVideo', (videoId) => {
        console.log('Changement de vidéo demandé :', videoId);
        io.emit('changeVideo', videoId);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
