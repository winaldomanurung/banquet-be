//Untuk menggenerate token yang dikirimkan dari Backend ke Frontend

const jwt = require("jsonwebtoken");

module.exports = {
  createToken: (payload) => {
    return jwt.sign(payload, "private123", {
      expiresIn: "12h",
    });
  },
};
