// controllers/protectedController.js
const { getDb } = require("../common/db");

// Helper: validate Authorization: Bearer <token> for a given runId.
async function validateBearerToken(req, res) {
  const auth = req.headers["authorization"];
  const runId = req.query.runId || req.body?.runId;

  if (!runId) {
    res.status(400).json({ error: "runId is required" });
    return null;
  }
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing_authorization" });
    return null;
  }

  const token = auth.slice("Bearer ".length).trim();

  try {
    const db = await getDb();
    const coll = db.collection("runs");
    const doc = await coll.findOne({ runId });

    if (!doc || !doc.currentToken) {
      res.status(401).json({ error: "no_token_issued" });
      return null;
    }

    const now = Date.now();
    const exp = new Date(doc.tokenExpiresAt).getTime();

    if (Number.isFinite(exp) && now > exp) {
      res.status(401).json({ error: "token_expired" });
      return null;
    }
    if (token !== doc.currentToken) {
      res.status(401).json({ error: "invalid_token" });
      return null;
    }

    return { ok: true, doc, db, coll, runId };
  } catch (err) {
    console.error("validateBearerToken failed:", err.message);
    res.status(500).json({ error: "internal_validation_error" });
    return null;
  }
}

// GET /api/createsession?runId=XXX   (requires Bearer token)
exports.createSession = async (req, res) => {
  const ctx = await validateBearerToken(req, res);
  if (!ctx) return;

  const { coll, runId } = ctx;
  const sessionId = `sess_${runId}_${Date.now().toString(36)}`;
  const nowIso = new Date().toISOString();

  await coll.updateOne(
    { runId },
    {
      $inc: { "perEndpointUsage.createsession": 1 },
      $set: { lastSessionId: sessionId },
      $push: {
        sessions: {
          sessionId,
          status: "active",
          createdAt: nowIso,
          updatedAt: nowIso
        }
      }
    },
    { upsert: true }
  );

  res.status(200).json({
    status: "ok",
    endpoint: "createsession",
    runId,
    sessionId,
    createdAt: nowIso
  });
};

// GET /api/updatesession?runId=XXX[&sessionId=YYY]
exports.updateSession = async (req, res) => {
  const ctx = await validateBearerToken(req, res);
  if (!ctx) return;

  const { coll, runId } = ctx;
  const nowIso = new Date().toISOString();

  const runDoc = await coll.findOne({ runId }, { projection: { lastSessionId: 1 } });
  const sessionId = req.query.sessionId || runDoc?.lastSessionId;

  if (!sessionId) {
    return res.status(404).json({ error: "no_session_found_for_run" });
  }

  await coll.updateOne(
    { runId, "sessions.sessionId": sessionId },
    {
      $set: { "sessions.$.updatedAt": nowIso, "sessions.$.status": "updated" },
      $inc: { "perEndpointUsage.updatesession": 1 }
    }
  );

  res.status(200).json({
    status: "ok",
    endpoint: "updatesession",
    runId,
    sessionId,
    updatedAt: nowIso
  });
};

// POST /api/cancelsession?runId=XXX[&sessionId=YYY]  (or body.sessionId)
exports.cancelSession = async (req, res) => {
  const ctx = await validateBearerToken(req, res);
  if (!ctx) return;

  const { coll, runId } = ctx;
  const nowIso = new Date().toISOString();

  const runDoc = await coll.findOne({ runId }, { projection: { lastSessionId: 1 } });
  const sessionId = req.query.sessionId || req.body?.sessionId || runDoc?.lastSessionId;

  if (!sessionId) {
    return res.status(404).json({ error: "no_session_found_for_run" });
  }

  await coll.updateOne(
    { runId, "sessions.sessionId": sessionId },
    {
      $set: { "sessions.$.updatedAt": nowIso, "sessions.$.status": "canceled" },
      $inc: { "perEndpointUsage.cancelsession": 1 }
    }
  );

  res.status(200).json({
    status: "ok",
    endpoint: "cancelsession",
    runId,
    sessionId,
    canceledAt: nowIso
  });
};
