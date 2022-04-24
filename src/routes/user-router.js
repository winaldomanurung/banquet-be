const express = require("express");
const router = express.Router();

const { user_controller } = require("../controllers");

router.get("/", user_controller.getUsers);
router.post("/register", user_controller.register);

module.exports = router;
