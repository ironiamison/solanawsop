import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { createGameIo } from "./src/lib/socket/create-io";

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST ?? (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || (dev ? "3001" : "3000"), 10);

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  createGameIo(server);

  server.listen(port, host, () => {
    const shown = host === "0.0.0.0" ? `http://localhost:${port}` : `http://${host}:${port}`;
    console.log(`> Solana Poker ready on ${shown}`);
  });
});
