// api/[...path].js
import app from "../server.js";

export default function handler(req, res) {
  // Rebuild proper Express URL from dynamic segments
  let path = "/";
  const segs = req.query?.path;
  if (Array.isArray(segs) && segs.length > 0) {
    path = "/" + segs.join("/");
  }

  // Preserve any query string (?runId=xxx)
  const qsIndex = req.url.indexOf("?");
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : "";

  // Final URL Express should see
  req.url = path + qs;

  return app(req, res);
}
