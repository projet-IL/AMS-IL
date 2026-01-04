import { io } from "socket.io-client";

const codeAcces = "06bc34bdbeb5";
const userId = 1;

const socket = io("http://localhost:4000", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("connected", socket.id);
  socket.emit("joinRoom", { codeAcces });

  setTimeout(() => {
    socket.emit("playlistAdd", {
      codeAcces,
      userId,
      url_video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      titre: "Rickroll socket",
    });
  }, 500);
});

socket.on("playlistItemAdded", (item) => console.log("playlistItemAdded", item));
socket.on("errorMessage", (e) => console.log("errorMessage", e));
