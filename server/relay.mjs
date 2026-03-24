import { WebSocketServer } from "ws";

const PORT = 9980;
const wss = new WebSocketServer({ port: PORT });

const clients = new Set();

wss.on("connection", (ws, req) => {
  const origin = req.headers.origin || req.socket.remoteAddress;
  console.log(`+ connected: ${origin}`);
  clients.add(ws);

  ws.on("message", (data) => {
    const msg = data.toString().trim();
    if (!msg) return;

    console.log(`  tap: ${msg}`);

    // Broadcast to all other clients (TouchDesigner sends, React receives)
    for (const client of clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(msg);
      }
    }
  });

  ws.on("close", () => {
    console.log(`- disconnected: ${origin}`);
    clients.delete(ws);
  });
});

console.log(`Relay server listening on ws://localhost:${PORT}`);
