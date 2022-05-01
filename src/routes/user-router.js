const express = require("express");
const router = express.Router();

const { user_controller } = require("../controllers");
const { auth } = require("../helpers/authToken");

router.get("/", user_controller.getUsers);
router.post("/register", user_controller.register);
// kita terjemahkan token dulu dengan auth baru lanjut ke controller
router.patch("/verify", auth, user_controller.verification);
router.post("/login", user_controller.login);
router.get("/:userId", user_controller.getById);
router.patch("/:userId", user_controller.edit);
router.post("/:userId/verify", user_controller.sendEmailVerification);
router.post("/:userId/upload-img", user_controller.uploadImage);
router.get("/:userId/get-img", user_controller.getImage);
// router.get("/:userId/logout", user_controller.logout);

module.exports = router;
