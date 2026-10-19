import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setIO, setupSocketListeners } from "./src/lib/socket-server";
import { checkAndHandleExpiredPayoutOrders } from "./src/lib/balance-engine";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  setIO(io);
  setupSocketListeners(io);

  // Background timer for payout order expirations & releases
  setInterval(() => {
    checkAndHandleExpiredPayoutOrders().catch((err) => console.error(err));
  }, 10000);

  httpServer.listen(port, () => {
    console.log(`> Mahadev Portal Server ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO real-time engine initialized on /socket.io`);
  });
});
