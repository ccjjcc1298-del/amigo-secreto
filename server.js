import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Servir los archivos directamente desde la raíz del proyecto
app.use(express.static(__dirname));

app.use("/api", apiRouter);

// Servir index.html para cualquier otra ruta
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Amigo Secreto corriendo en http://localhost:${PORT}`);
});
