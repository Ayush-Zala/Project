/**
 * ws-server.ts
 * ─────────────────────────────────────────────────────────────
 * Standalone Socket.io WebSocket gateway.
 *
 * Start with:  npm run ws       (see package.json scripts)
 *
 * Architecture:
 *   Next.js API route  →  POST /internal/emit  →  this server
 *                        →  io.to("dashboard").emit(event)
 *                           → every connected dashboard client
 * ─────────────────────────────────────────────────────────────
 */
import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server as SocketServer } from "socket.io";

const PORT = parseInt(process.env.WS_PORT || "3001", 10);
const CLIENT_ORIGIN = process.env.NEXTJS_URL || "http://localhost:3000";

// ── HTTP server with a tiny internal-emit route ────────────────
const httpServer = createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    // Only handle POST /internal/emit — everything else → 404
    if (req.method === "POST" && req.url === "/internal/emit") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const { event, payload } = JSON.parse(body) as {
            event: string;
            payload: Record<string, unknown>;
          };
          // Broadcast to everyone in the "dashboard" room
          io.to("dashboard").emit(event, payload);
          console.log(`[WS] Broadcasted ${event}`, payload);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Bad payload" }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  }
);

// ── Socket.io server ───────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Clients call this to start receiving dashboard broadcasts
  socket.on("join:dashboard", () => {
    socket.join("dashboard");
    console.log(`[WS] ${socket.id} joined dashboard room`);
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[WS] WebSocket gateway ready on http://localhost:${PORT}`);
});
