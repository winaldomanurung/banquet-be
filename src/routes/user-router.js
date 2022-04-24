const express = require("express");
const router = express.Router();

const { user_controller } = require("../controllers");
const { auth } = require("../helpers/authToken");

router.get("/", user_controller.getUsers);
router.post("/register", user_controller.register);
// kita terjemahkan token dulu dengan auth baru lanjut ke controller

router.patch("/verify", auth, user_controller.verification);

module.exports = router;
