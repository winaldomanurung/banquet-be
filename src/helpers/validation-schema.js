const Joi = require("joi");

/* //////////////////////// */
/* ///// REGISTER USER /////*/
/* //////////////////////// */
module.exports.registerUserSchema = Joi.object({
  username: Joi.string().min(3).max(20).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(6)
    .max(20)
    .pattern(/[!@#$%&*_!]/)
    .required(),
  repeat_password: Joi.ref("password"),
});

module.exports.patchUserSchema = Joi.object({
  fullname: Joi.string().min(3).max(50).allow(null, ""),
  username: Joi.string().min(3).max(20),
  bio: Joi.string().max(200).allow(null, ""),
  imageUrl: Joi.string(),
});

module.exports.loginUserSchema = Joi.object({
  credential: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).max(13).required(),
  // password : Joi.string().min(6).max(13).pattern(/[!@#$%&*_!]/).required()
});

module.exports.resetPasswordUserSchema = Joi.object({
  email: Joi.string().email().required(),
});

module.exports.addRestaurantSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  location: Joi.string().min(3).max(20).required(),
  type: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string().min(3).max(400).required(),
});

module.exports.addReviewSchema = Joi.object({
  restaurantId: Joi.required(),
  userId: Joi.required(),
  reviewTitle: Joi.string().min(3).max(30).required(),
  reviewDescription: Joi.string().min(3).max(300).required(),
});
