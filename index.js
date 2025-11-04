// index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { issueToken } from "./controllers/authController.js";
import { reset } from "./controllers/adminController.js";


const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Endpoints ---
app.post("/token", issueToken);
app.post("/admin/reset", reset);
app.get("/health", (req, res) => res.json({ ok: true }));

// --- Start server ---
const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Mock server running on port ${port}`));
