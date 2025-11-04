// api/[...path].js
import app from "../server.js";
import { createServer } from "http";
import { parse } from "url";

// This bridge manually passes req/res into Express
export default async function handler(req, res) {
  const parsedUrl = parse(req.url, true);
  req.url = parsedUrl.path; // keep /api/token etc.

  // Create a Node server instance for Express to use
  const server = createServer((req_, res_) => app(req_, res_));
  server.emit("request", req, res);
}
