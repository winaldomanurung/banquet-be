const Joi = require("joi");

/* //////////////////////// */
/* ///// REGISTER USER /////*/
/* //////////////////////// */
module.exports.registerUserSchema = Joi.object({
  username: Joi.string().min(3).max(20).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(13).required(),
  repeat_password: Joi.ref("password"),
});

module.exports.patchUserSchema = Joi.object({
  fullname: Joi.string().min(3).max(50),
  username: Joi.string().min(3).max(20),
  bio: Joi.string().max(200),
  imageUrl: Joi.string(),
});

module.exports.loginUserSchema = Joi.object({
  credential: Joi.string().min(3).max(20).required(),
  password: Joi.string().min(6).max(13).required(),
  // password : Joi.string().min(6).max(13).pattern(/[!@#$%&*_!]/).required()
});