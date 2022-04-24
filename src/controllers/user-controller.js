const uuid = require("uuid");
const database = require("../config").promise();
const { registerUserSchema } = require("../helpers/validation-schema");
const { createToken } = require("../helpers/createToken");
const transporter = require("../helpers/nodemailer");

module.exports.getUsers = async (req, res) => {
  res.status(200).send("<h1>List of users</h1>");
};

module.exports.register = async (req, res) => {
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

    // 3. Validasi apakah email dan username unique
    const CHECK_USER = `SELECT id FROM users WHERE username = ? OR email = ?`;
    const [USER_DATA] = await database.execute(CHECK_USER, [username, email]);
    if (USER_DATA.length) {
      const err = new Error("Error");
      console.log(err);
      err.statusCode = 500;
      err.message = "Email or username already exists.";

      throw err;
    }

    // 4. Create user ID
    const uid = uuid.v4();

    // 5. Password hashing
    // reserved

    // 6. Store data user yang melakukan registrasi ke dalam database
    const INSERT_USER = `INSERT INTO users (userId, username, email, password) VALUES(${database.escape(
      uid
    )}, ${database.escape(username)}, ${database.escape(
      email
    )}, ${database.escape(password)});
        `;
    const [INFO] = await database.execute(INSERT_USER);
    // console.log(INFO);

    // 7. Generate Token
    // console.log("generate token");
    const GET_USER_BY_ID = `SELECT * FROM users WHERE userId = ?;`;
    const [USER_BY_ID] = await database.execute(GET_USER_BY_ID, [uid]);
    console.log("USER_BY_ID: ", USER_BY_ID[0]);

    //bahan token
    let material1 = USER_BY_ID[0].userId;
    let material2 = USER_BY_ID[0].username;
    let material3 = USER_BY_ID[0].email;
    let material4 = USER_BY_ID[0].isVerified;

    //create token
    let token = createToken({ material1, material2, material3, material4 });
    console.log(token);

    // 8. Kirim email verification dengan nodemailer
    let mail = {
      from: "Admin <banquet.service2022@gmail.com",
      to: `${email}`,
      subject: "Banquet Account Verification",
      html: `<a href='http://localhost:3000/authentication/${token}'>Click here to verify your Banquet Account.</a>`,
    };

    transporter.sendMail(mail, (errMail, resMail) => {
      if (errMail) {
        console.log(errMail);
        res.status(500).send({
          message: "Registration failed!",
          success: false,
          err: errMail,
        });
      }
      res.status(200).send({
        message:
          "Registration success, check your email for account verification",
        success: true,
      });
    });

    // res.status(200).send("<h1>List of users</h1>");
  } catch (err) {
    res.status(err.statusCode).send(err);
  }
};

module.exports.verification = async (req, res) => {
  // req.user didapat dari proses decoding di authToken.js dimana token diubah kembali menjadi data awalnya
  console.log(req.user);
  try {
    let UPDATE_USER_VERIFICATION = `UPDATE users SET isVerified=1 WHERE userId=${database.escape(
      req.user.material1
    )};`;
    console.log(UPDATE_USER_VERIFICATION);
    const [VERIFIED_USER] = await database.execute(UPDATE_USER_VERIFICATION);
    res.status(200).send({
      message: "Account verification success.",
    });
  } catch (err) {
    res.status(err.statusCode).send(err);
  }
};
