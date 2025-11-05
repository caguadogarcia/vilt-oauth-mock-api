// controllers/authController.js
const crypto = require("crypto");
const { getDb } = require("../common/db");

exports.issueToken = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  const ttlSec = 120;
  const now = Date.now();
  const expiresAtIso = (t) => new Date(t).toISOString();

  try {
    // If Mongo is configured, use it to cache per runId
    if (process.env.MONGODB_URI) {
      const db = await getDb();
      const coll = db.collection("runs");

      // 1) Try to read existing token
      const doc = await coll.findOne({ runId }, { projection: { currentToken: 1, tokenExpiresAt: 1 } });
      const notExpired = doc?.currentToken && doc?.tokenExpiresAt && now < new Date(doc.tokenExpiresAt).getTime();

      if (notExpired) {
        const remaining = Math.max(1, Math.floor((new Date(doc.tokenExpiresAt).getTime() - now) / 1000));
        // Count the hit
        await coll.updateOne({ runId }, { $inc: { tokenHits: 1 } });
        return res.status(200).json({
          access_token: doc.currentToken,
          token_type: "Bearer",
          expires_in: remaining
        });
      }

      // 2) Create/rotate token
      const newToken = crypto.randomBytes(32).toString("base64url");
      const expMs = now + ttlSec * 1000;

      await coll.updateOne(
        { runId },
        {
          $set: { currentToken: newToken, tokenExpiresAt: expiresAtIso(expMs) },
          $inc: { tokenHits: 1, tokenRotations: 1 },
          $push: { issuedTokens: { token: newToken, expiresAt: expiresAtIso(expMs), issuedAt: expiresAtIso(now) } }
        },
        { upsert: true }
      );

      return res.status(200).json({
        access_token: newToken,
        token_type: "Bearer",
        expires_in: ttlSec
      });
    }
  } catch (e) {
    console.error("Mongo cache failed:", e.message);
    // fall through to stateless behavior
  }

  // Fallback: stateless (no Mongo configured or failed)
  const token = crypto.randomBytes(32).toString("base64url");
  return res.status(200).json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ttlSec
  });
};
