// api/[...path].js
import app from "../server.js";

export default function handler(req, res) {
  // Vercel provides the dynamic segments here:
  //   /api/health            -> req.query.path === ['health']
  //   /api/admin/reset       -> req.query.path === ['admin', 'reset']
  //   /api/token?runId=123   -> req.query.path === ['token']
  const segs = req.query?.path;
  const path = Array.isArray(segs) ? `/${segs.join("/")}` : `/${segs || ""}`;

  // Preserve the original query string (if any)
  const qsIndex = req.url.indexOf("?");
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : "";

  // Make Express see exactly "/health", "/admin/reset", "/token", etc.
  req.url = path + qs;

  return app(req, res);
}
