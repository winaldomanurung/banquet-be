const uuid = require("uuid");
const { registerUserSchema } = require("../helpers/validation-schema");

module.exports.getUsers = async (req, res) => {
  res.status(200).send("<h1>List of users</h1>");
};

module.exports.register = (req, res) => {
  const { username, email, password, repeat_password } = req.body;
  try {
    // 1. Validasi password apakah match dengan repeat password
    if (password != repeat_password) {
      const err = new Error("Error");
      err.statusCode = 500;
      err.message = "The password doesn't match";
      throw err;
    }

    // 2. Validasi req.body, apakah sesuai dengan schema Joi
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
      const err = new Error("Error");
      err.statusCode = 500;
      err.message = error.details[0].message;
      console.log(error.details);
      throw err;
    }
    res.status(200).send("<h1>List of users</h1>");
  } catch (err) {
    res.status(err.statusCode).send(err.message);
  }
};
