import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('play', () => {
    socket.broadcast.emit('play');
  });

  socket.on('pause', () => {
    socket.broadcast.emit('pause');
  });

  socket.on('seek', (time) => {
    socket.broadcast.emit('seek', time);
  });

  socket.on('videoTime', (time) => {
    socket.broadcast.emit('syncTime', time);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});