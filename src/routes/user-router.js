const express = require("express");
const router = express.Router();

const { user_controller } = require("../controllers");

router.get("/users", user_controller.getUsers);

module.exports = router;
