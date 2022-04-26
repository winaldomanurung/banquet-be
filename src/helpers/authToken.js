//Untuk menerjemahkan token yang dikirimkan Frontend ke Backend

const jwt = require("jsonwebtoken");

module.exports = {
  // Next untuk melanjutkan ke middleware di controller
  auth: (req, res, next) => {
    console.log(req.token);
    const token = req.token;
    jwt.verify(token, "private123", (err, decode) => {
      if (err) {
        return res.status(401).send("User not auth");
      }
      req.user = decode;
      next(); //untuk mengirimkan req.user ke controller
    });
  },
};
