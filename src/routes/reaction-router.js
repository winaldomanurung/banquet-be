const express = require("express");
const { reaction_controller } = require("../controllers");
const route = express.Router();

route.post("/like", reaction_controller.like);
route.post("/dislike", reaction_controller.dislike);
route.post("/counter", reaction_controller.counter);

module.exports = route;
