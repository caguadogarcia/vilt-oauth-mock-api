// api/[...path].js
import app from "../server.js";
import serverless from "serverless-http";

const handler = serverless(app);
export default handler;
