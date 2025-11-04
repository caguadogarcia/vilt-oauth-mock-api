// controllers/adminController.js
import { getDb } from "../common/db.js";

export async function reset(req, res) {
  const runId = req.query.runId;
  if (!runId) {
    return res.status(400).json({ error: "runId is required" });
  }

  try {
    const db = await getDb();
    const runs = db.collection("runs");

    const freshDoc = {
      runId,
      tokenHits: 0,
      issuedTokens: [],
      seenBearerTokens: [],
      perEndpointUsage: {
        createsession: 0,
        updatesession: 0,
        cancelsession: 0
      },
      nextTokenTtlSeconds: 120
    };

    await runs.updateOne({ runId }, { $set: freshDoc }, { upsert: true });

    res.status(200).json({ message: "reset ok", runId });
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
}
