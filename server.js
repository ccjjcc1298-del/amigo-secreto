import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./src/routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", apiRouter);

// SPA fallback: cualquier ruta que no sea /api sirve el index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Amigo Secreto corriendo en http://localhost:${PORT}`);
});
