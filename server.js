/**
 * Real-Time Chat Server
 * ---------------------
 * A multi-room chat server built on raw WebSockets (the `ws` library) with
 * an Express server for serving static files.
 *
 * Concurrency / networking concepts demonstrated:
 *  - Handling many simultaneous full-duplex WebSocket connections
 *  - Broadcasting messages to a subset of connected clients (room-based)
 *  - Tracking presence (who is online, per room) as connections open/close
 *  - Heartbeat / ping-pong to detect and clean up dead connections
 *  - Graceful handling of disconnects and malformed messages
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve the frontend
app.use(express.static(path.join(__dirname, "public")));

/**
 * In-memory state.
 * Structure: rooms = Map<roomName, Map<clientId, { ws, username }>>
 * Everything lives in memory only — no database, no external services,
 * no cost, and it resets when the server restarts.
 */
const rooms = new Map();

function getRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Map());
  }
  return rooms.get(roomName);
}

function broadcastToRoom(roomName, payload, excludeId = null) {
  const room = rooms.get(roomName);
  if (!room) return;
  const message = JSON.stringify(payload);
  for (const [id, client] of room.entries()) {
    if (id === excludeId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function getUserList(roomName) {
  const room = rooms.get(roomName);
  if (!room) return [];
  return Array.from(room.values()).map((c) => c.username);
}

function removeClientFromRoom(roomName, clientId) {
  const room = rooms.get(roomName);
  if (!room) return;
  const client = room.get(clientId);
  room.delete(clientId);

  if (room.size === 0) {
    rooms.delete(roomName);
  }

  if (client) {
    broadcastToRoom(roomName, {
      type: "system",
      text: `${client.username} left the room.`,
      timestamp: Date.now(),
    });
    broadcastToRoom(roomName, {
      type: "presence",
      users: getUserList(roomName),
    });
  }
}

wss.on("connection", (ws) => {
  const clientId = crypto.randomUUID();
  let currentRoom = null;
  let username = null;

  // Heartbeat: mark connection alive on pong, used to prune dead sockets
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", text: "Invalid message format." }));
      return;
    }

    switch (data.type) {
      case "join": {
        username = String(data.username || "Anonymous").slice(0, 24);
        currentRoom = String(data.room || "general").slice(0, 24);

        const room = getRoom(currentRoom);
        room.set(clientId, { ws, username });

        ws.send(
          JSON.stringify({
            type: "joined",
            room: currentRoom,
            username,
            users: getUserList(currentRoom),
          })
        );

        broadcastToRoom(
          currentRoom,
          {
            type: "system",
            text: `${username} joined the room.`,
            timestamp: Date.now(),
          },
          clientId
        );

        broadcastToRoom(currentRoom, {
          type: "presence",
          users: getUserList(currentRoom),
        });
        break;
      }

      case "message": {
        if (!currentRoom || !username) return;
        const text = String(data.text || "").slice(0, 2000);
        if (!text.trim()) return;

        broadcastToRoom(currentRoom, {
          type: "message",
          username,
          text,
          timestamp: Date.now(),
        });
        break;
      }

      case "typing": {
        if (!currentRoom || !username) return;
        broadcastToRoom(
          currentRoom,
          {
            type: "typing",
            username,
            isTyping: Boolean(data.isTyping),
          },
          clientId
        );
        break;
      }

      default:
        ws.send(JSON.stringify({ type: "error", text: `Unknown message type: ${data.type}` }));
    }
  });

  ws.on("close", () => {
    if (currentRoom) {
      removeClientFromRoom(currentRoom, clientId);
    }
  });

  ws.on("error", () => {
    if (currentRoom) {
      removeClientFromRoom(currentRoom, clientId);
    }
  });
});

// Ping every connected client every 30s; terminate any that didn't pong back
// since the last check. This prevents "ghost" connections from piling up.
const HEARTBEAT_INTERVAL_MS = 30000;
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on("close", () => clearInterval(heartbeat));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
