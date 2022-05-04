const express = require("express");
const { restaurant_controller } = require("../controllers");
const route = express.Router();

route.get("/", restaurant_controller.getRestaurants);
route.get("/get-my-restaurants", restaurant_controller.getMyRestaurants);
route.get("/:restaurantId", restaurant_controller.getRestaurantById);
route.post("/", restaurant_controller.addRestaurant);
route.patch("/:restaurantId", restaurant_controller.editRestaurant);
route.delete("/:restaurantId", restaurant_controller.deleteRestaurant);

module.exports = route;
