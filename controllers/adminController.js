// controllers/adminController.js (CommonJS)
const { getDb } = require("../common/db");

// Reset: remove any state for runId
exports.reset = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  try {
    if (!process.env.MONGODB_URI) {
      return res.status(200).json({ message: "MongoDB not configured; nothing to reset.", runId });
    }
    const db = await getDb();
    const result = await db.collection("runs").deleteOne({ runId });
    res.status(200).json({
      message: result.deletedCount > 0 ? "reset ok" : "no data to reset",
      runId
    });
  } catch (err) {
    console.error("Reset failed:", err.message);
    res.status(500).json({ error: "Reset failed", details: err.message });
  }
};

// Metrics: read metrics for runId
exports.metrics = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  try {
    if (!process.env.MONGODB_URI) {
      return res.status(200).json({ message: "MongoDB not configured; no metrics.", runId });
    }
    const db = await getDb();
    const doc = await db.collection("runs").findOne(
      { runId },
      {
        projection: {
          runId: 1,
          tokenHits: 1,
          tokenRotations: 1,
          tokenExpiresAt: 1,
          nextTokenTtlSeconds: 1,
          perEndpointUsage: 1,
          "issuedTokens": { $slice: -3 } 
        }
      }
    );
    if (!doc) return res.status(200).json({ message: "no data", runId });

    res.status(200).json(doc);
  } catch (err) {
    console.error("Metrics failed:", err.message);
    res.status(500).json({ error: "Metrics failed", details: err.message });
  }
};

// Config: Configure TTL (used on next rotation)
exports.config = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  const ttl = Number(req.query.ttlSeconds ?? req.body?.ttlSeconds);
  if (!runId) return res.status(400).json({ error: "runId is required" });
  if (!Number.isFinite(ttl) || ttl <= 0) return res.status(400).json({ error: "ttlSeconds must be > 0" });

  try {
    if (!process.env.MONGODB_URI) {
      return res.status(200).json({ message: "MongoDB not configured; config ignored.", runId, ttlSeconds: ttl });
    }
    const db = await getDb();
    await db.collection("runs").updateOne(
      { runId },
      { $set: { nextTokenTtlSeconds: ttl } },
      { upsert: true }
    );

    res.status(200).json({ message: "config ok", runId, ttlSeconds: ttl });
  } catch (err) {
    console.error("Config failed:", err.message);
    res.status(500).json({ error: "Config failed", details: err.message });
  }
};

// Tokens issued
exports.tokens = async (req, res) => {
  const runId = req.query.runId || req.body?.runId;
  if (!runId) return res.status(400).json({ error: "runId is required" });

  try {
    const db = await getDb();
    const coll = db.collection("runs");

    const doc = await coll.findOne(
      { runId },
      {
        projection: {
          runId: 1,
          issuedTokens: 1,
          currentToken: 1,
          tokenExpiresAt: 1,
          tokenRotations: 1,
          tokenHits: 1
        }
      }
    );

    if (!doc) {
      return res.status(200).json({
        runId,
        tokenHits: 0,
        tokenRotations: 0,
        currentToken: null,
        tokenExpiresAt: null,
        count: 0,
        issuedTokens: []
      });
    }

    const tokens = (doc.issuedTokens || []).map((t, i) => ({
      index: i + 1,
      token: t.token,
      issuedAt: t.issuedAt,
      expiresAt: t.expiresAt,
      isCurrent: doc.currentToken === t.token
    }));

    return res.status(200).json({
      runId: doc.runId,
      tokenHits: doc.tokenHits || 0,
      tokenRotations: doc.tokenRotations || 0,
      currentToken: doc.currentToken || null,
      tokenExpiresAt: doc.tokenExpiresAt || null,
      count: tokens.length,
      issuedTokens: tokens
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
};
