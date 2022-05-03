//Untuk menerjemahkan token yang dikirimkan Frontend ke Backend

const jwt = require("jsonwebtoken");

module.exports = {
  // Next untuk melanjutkan ke middleware di controller
  auth: (req, res, next) => {
    console.log(req);
    // console.log(JSON.stringify(req.headers));
    console.log(req.get("Auth-Token"));
    // console.log(req.token);
    console.log("Masuk auth");
    console.log(req.token);
    console.log("Lewat auth");

    // const token = req.token;
    const token = req.get("Auth-Token");
    jwt.verify(token, "private123", (err, decode) => {
      if (err) {
        return res.status(401).send("User not auth");
      }
      req.user = decode;
      next(); //untuk mengirimkan req.user ke controller
    });
  },
};
