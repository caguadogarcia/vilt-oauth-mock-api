// controllers/authController.js 
const crypto = require("crypto");
const { getDb } = require("../common/db");

exports.issueToken = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  const now = Date.now();
  const asIso = (t) => new Date(t).toISOString();

  try {
    if (process.env.MONGODB_URI) {
      const db = await getDb();
      const coll = db.collection("runs");

      const doc = await coll.findOne(
        { runId },
        {
          projection: {
            currentToken: 1,
            tokenExpiresAt: 1,
            nextTokenTtlSeconds: 1,
            tokenHits: 1,
            tokenRotations: 1,
            "perEndpointUsage.token": 1
          }
        }
      );

      // Increment endpoint usage + overall hits
      await coll.updateOne(
        { runId },
        {
          $inc: {
            tokenHits: 1,
            "perEndpointUsage.token": 1
          }
        },
        { upsert: true }
      );

      const expiresMs = doc?.tokenExpiresAt ? new Date(doc.tokenExpiresAt).getTime() : 0;
      const notExpired = doc?.currentToken && now < expiresMs;

      if (notExpired) {
        const remaining = Math.max(1, Math.floor((expiresMs - now) / 1000));
        return res.status(200).json({
          access_token: doc.currentToken,
          token_type: "Bearer",
          expires_in: remaining
        });
      }

      // Determine TTL to use for the new token
      const ttlSec = Number.isFinite(doc?.nextTokenTtlSeconds) && doc.nextTokenTtlSeconds > 0
        ? doc.nextTokenTtlSeconds
        : 120;

      const newToken = crypto.randomBytes(32).toString("base64url");
      const expMs = now + ttlSec * 1000;

      await coll.updateOne(
        { runId },
        {
          $set: {
            currentToken: newToken,
            tokenExpiresAt: asIso(expMs)
          },
          $inc: {
            tokenRotations: 1
          },
          $push: {
            issuedTokens: {
              token: newToken,
              issuedAt: asIso(now),
              expiresAt: asIso(expMs)
            }
          }
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
    console.error("Mongo cache/metrics failed:", e.message);
  }

  // Fallback : always new token with default TTL
  const ttlSec = 120;
  const token = crypto.randomBytes(32).toString("base64url");
  return res.status(200).json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ttlSec
  });
};
