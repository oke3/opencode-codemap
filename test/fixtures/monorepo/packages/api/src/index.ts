import express from "express";
const app = express();
app.get("/", (_, res) => res.send("ok"));
export default app;
