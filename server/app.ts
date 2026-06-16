import express from "express";
import cors from "cors";
import router from "./routes";

const app = express();

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: false,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api", router); // auth applied per-endpoint in each route file

if (!process.env.VERCEL) {
  const port = process.env.PORT ?? 3000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

export default app;
