import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("client connected", socket.id);
  socket.emit("joinRoom", { codeAcces: "06bc34bdbeb5" });
});

socket.on("joinedRoom", (data) => console.log("joinedRoom", data));
socket.on("participantsUpdated", (data) => console.log("participantsUpdated", data));
socket.on("errorMessage", (e) => console.log("errorMessage", e));
