const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 2000;
app.listen(PORT, () => console.log(`API is connected at PORT: ${PORT}.`));
