const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { createGameState, handleBid, playCard, revealTrump } = require("./gameLogic");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    const { action, roomId, payload } = data;

    if (!rooms[roomId]) rooms[roomId] = createGameState(roomId);

    switch (action) {
      case "BID_PLACED":
        handleBid(rooms[roomId], payload);
        break;
      case "CARD_PLAYED":
        playCard(rooms[roomId], payload);
        break;
      case "TRUMP_REVEALED":
        revealTrump(rooms[roomId], payload);
        break;
    }

    // Broadcast updated state
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ roomId, state: rooms[roomId] }));
      }
    });
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
