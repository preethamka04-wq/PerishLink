
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("PerishLink Backend is running!");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`PerishLink server running on http://localhost:${PORT}`);
});
