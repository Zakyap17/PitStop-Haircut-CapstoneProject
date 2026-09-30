const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "pitstop-backend" });
});

app.listen(PORT, () => {
  console.log(`PitStop backend running on http://localhost:${PORT}`);
});
