const uuid = require("uuid");

module.exports.getUsers = async (req, res) => {
  res.status(200).send("<h1>List of users</h1>");
};

module.exports.register = (req, res) => {
  const { username, email, password, repeat_password } = req.body;
  try {
    // 1. Validasi password apakah match dengan repeat password
    if (password != repeat_password) {
      const err = new Error("The password doesn't match");
      err.statusCode = 500;
      err.message = "The password doesn't match";
      throw err;
    }
    res.status(200).send("<h1>List of users</h1>");
  } catch (err) {
    res.status(err.statusCode).send(err.message);
  }
};
