//Untuk menerjemahkan token yang dikirimkan Frontend ke Backend

const jwt = require("jsonwebtoken");

module.exports = {
  // Next untuk melanjutkan ke middleware di controller
  auth: (req, res, next) => {
    // const token = req.token;
    const token = req.get("Auth-Token");
    jwt.verify(token, "private123", (err, decode) => {
      if (err) {
        return res.status(401).send("User not auth");
      }
      req.user = decode;
      next(); //untuk mengirimkan req.user ke controller
    });
    // console.log("keluar auth");
  },
};
