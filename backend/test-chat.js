import { io } from "socket.io-client";

const codeAcces = "06bc34bdbeb5";
const userId = 1;

const socket = io("http://localhost:4000", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("connected", socket.id);

  socket.emit("joinRoom", { codeAcces });

  setTimeout(() => {
    socket.emit("chatMessage", {
      codeAcces,
      userId,
      contenu: "Message socket: Damian",
    });
  }, 500);
});

socket.on("participantsUpdated", (d) => console.log("participantsUpdated", d));
socket.on("joinedRoom", (d) => console.log("joinedRoom", d));
socket.on("chatMessageCreated", (m) => console.log("chatMessageCreated", m));
socket.on("errorMessage", (e) => console.log("errorMessage", e));
