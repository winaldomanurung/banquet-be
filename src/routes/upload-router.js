const express = require("express");
const { upload_controller } = require("../controllers");
const route = express.Router();

route.post("/", upload_controller.uploadFile);
route.get("/get", upload_controller.getAlbum);

module.exports = route;
