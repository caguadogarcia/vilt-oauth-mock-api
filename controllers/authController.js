// controllers/authController.js
const crypto = require("crypto");

exports.issueToken = (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  const ttlSec = 120;
  const token = crypto.randomBytes(32).toString("base64url");

  res.status(200).json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ttlSec
  });
};
