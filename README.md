# Real-Time Chat Server (WebSockets)

A multi-room, real-time chat application built with **Node.js**, **Express**, and the **`ws`** WebSocket library. Runs entirely on your own machine — no paid services, no external database, no account sign-ups.

## What it demonstrates

- Handling many concurrent, full-duplex WebSocket connections
- Room-based message broadcasting (only clients in the same room receive a message)
- Live presence tracking (who's online, updated as people join/leave)
- Typing indicators
- A heartbeat (ping/pong) system that detects and cleans up dead connections
- Basic input sanitization and defensive handling of malformed messages

## Architecture

```
Browser (client.js) <--WebSocket--> Node.js server (server.js)
                                          |
                                    In-memory state
                                    (rooms, users)
```

- **`server.js`** — Express serves the static frontend; the `ws` library manages
  WebSocket connections. Server state (which users are in which rooms) lives
  entirely in memory in a `Map` — no database needed. This means data resets
  if you restart the server, which is fine for a chat demo.
- **`public/`** — plain HTML/CSS/JS frontend. No frameworks, no build step.

## Requirements

- [Node.js](https://nodejs.org/) version 18 or later (includes `npm`). This is
  the only thing you need to install — everything else (`express`, `ws`) is
  pulled in automatically as free, open-source packages when you run
  `npm install`.

## How to run it

1. **Unzip the project folder** and open a terminal inside it.

2. **Install dependencies** (one-time step, downloads `express` and `ws` into
   a local `node_modules` folder — nothing is sent anywhere, nothing costs
   money):

   ```bash
   npm install
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

   You should see:

   ```
   Chat server running at http://localhost:3000
   ```

4. **Open the app** in your browser:

   ```
   http://localhost:3000
   ```

5. **Test with multiple users** by opening the same URL in several browser
   tabs, or in different browsers (Chrome + Firefox), or on another device on
   the same Wi-Fi network using your computer's local IP address (e.g.
   `http://192.168.1.23:3000`). Enter different names, join the same room
   name, and chat between them in real time.

To stop the server, go back to the terminal and press `Ctrl + C`.

## Project structure

```
realtime-chat/
├── package.json       # dependencies + start script
├── server.js          # WebSocket + Express server (all backend logic)
├── README.md
└── public/
    ├── index.html      # join screen + chat UI
    ├── style.css
    └── client.js       # WebSocket client logic
```

## Ideas for extending it (good for showing growth in an interview)

## License

MIT — do whatever you want with this.
