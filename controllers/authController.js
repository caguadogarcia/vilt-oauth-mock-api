// controllers/authController.js
import crypto from "crypto";
import { getDb } from "../common/db.js";

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function issueToken(req, res) {
  const runId = req.query.runId;
  if (!runId) {
    return res.status(400).json({ error: "runId is required" });
  }

  try {
    const db = await getDb();
    const runs = db.collection("runs");

    const ttlSec = 120;
    const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
    const newToken = randomToken();

    await runs.updateOne(
      { runId },
      {
        $push: {
          issuedTokens: { token: newToken, expiresAt }
        },
        $inc: { tokenHits: 1 }
      },
      { upsert: true }
    );

    res.status(200).json({
      access_token: newToken,
      token_type: "Bearer",
      expires_in: ttlSec
    });
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
}
