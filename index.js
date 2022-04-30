const express = require("express");
const cors = require("cors");
const bearerToken = require("express-bearer-token");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

const routers = require("./src/routes");

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", exposedHeaders: "token" }));
app.use(bearerToken());

app.use(express.static("public"));

// Database Connection
const connection = require("./src/config");
connection.connect((error) => {
  if (error) {
    console.log("Database connection error: ", error);
  }

  console.log(
    `Database connection is established at ID: ${connection.threadId}`
  );
});

app.get("/", (req, res) => res.status(200).send("<h1>Welcome</h1>"));

/* /////////////// */
/* ///// USER /////*/
/* /////////////// */
app.use("/users", routers.user_router);
// app.use("/upload", routers.upload_router);

const PORT = 2000;
app.listen(PORT, () => console.log(`API is connected at PORT: ${PORT}.`));
