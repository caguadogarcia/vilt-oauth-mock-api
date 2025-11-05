// api/[...path].js
import app from "../server.js";
import serverless from "serverless-http";

export const handler = serverless(app);

// Vercel uses `default` export, not `handler`
export default async function(req, res) {
  try {
    // Await ensures serverless-http finishes before returning
    await handler(req, res);
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
