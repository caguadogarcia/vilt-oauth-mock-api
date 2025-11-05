// controllers/adminController.js (CommonJS)
const { getDb } = require("../common/db");

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
