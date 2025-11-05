// index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const { issueToken } = require("./controllers/authController");

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- ONLY your endpoint ---
app.post("/token", issueToken);

// Local dev server only (Vercel imports the app instead)
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 8000;
  app.listen(port, () => console.log(`Mock OAuth server running on ${port}`));
}

module.exports = app;
