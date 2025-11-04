// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { issueToken } from "./controllers/authController.js";
import { reset } from "./controllers/adminController.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoints
app.post("/token", issueToken);
app.post("/admin/reset", reset);
app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
