//Untuk menggenerate token yang dikirimkan dari Backend ke Frontend

const jwt = require("jsonwebtoken");

module.exports = {
  createToken: (payload) => {
    let token = jwt.sign(payload, "private123", {
      expiresIn: "12h",
    });
    console.log("TOKEN:", token);
    return token;
  },
};
