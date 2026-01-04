import { io } from "socket.io-client";

const codeAcces = "06bc34bdbeb5";
const itemId = 3; // mets l'id que tu veux supprimer

const socket = io("http://localhost:4000", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("connected", socket.id);
  socket.emit("joinRoom", { codeAcces });

  setTimeout(() => {
    socket.emit("playlistRemove", { codeAcces, itemId });
  }, 500);
});

socket.on("playlistItemRemoved", (d) => console.log("playlistItemRemoved", d));
socket.on("errorMessage", (e) => console.log("errorMessage", e));
