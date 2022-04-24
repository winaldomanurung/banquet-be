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
