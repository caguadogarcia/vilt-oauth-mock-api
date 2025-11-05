// controllers/authController.js
const crypto = require("crypto");
const { getDb } = require("../common/db");

exports.issueToken = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  const ttlSec = 120;
  const token = crypto.randomBytes(32).toString("base64url");

  try {
    if (process.env.MONGODB_URI) {
      const db = await getDb();
      await db.collection("runs").updateOne(
        { runId },
        {
          $push: { issuedTokens: { token, expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString() } },
          $inc: { tokenHits: 1 }
        },
        { upsert: true }
      );
    }
  } catch (e) {
    console.error("Mongo log failed:", e.message);
  }

  res.status(200).json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ttlSec
  });
};
