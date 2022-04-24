const express = require("express");
const cors = require("cors");

const app = express();

const routers = require("./src/routes");

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => res.status(200).send("<h1>Welcome</h1>"));

/* /////////////// */
/* ///// USER /////*/
/* /////////////// */
app.use("/users", routers.user_router);

const PORT = 2000;
app.listen(PORT, () => console.log(`API is connected at PORT: ${PORT}.`));
