const uuid = require("uuid");
const database = require("../config").promise();
const {
  registerUserSchema,
  patchStudentSchema,
} = require("../helpers/validation-schema");
const { createToken } = require("../helpers/createToken");
const transporter = require("../helpers/nodemailer");
const databaseSync = require("../config");
const { uploader } = require("../helpers/uploader");
const fs = require("fs");

module.exports.getUsers = async (req, res) => {
  res.status(200).send("<h1>List of users</h1>");
};

module.exports.getById = async (req, res) => {
  const userId = req.params.userId;

  try {
    const GET_USER_BY_ID = `
          SELECT * 
          FROM users 
          WHERE userId = ?; 
      `;
    const [USER] = await database.execute(GET_USER_BY_ID, [userId]);

    // validate
    if (!USER.length) {
      const err = new Error("Error");
      err.statusCode = 500;
      err.message = "ID not found";
      throw err;
    }

    // create respond
    res.status(200).send({
      data: USER,
      message: "OK",
    });
  } catch (err) {
    res.status(err.statusCode).send(err.message);
  }
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

module.exports.sendEmailVerification = async (req, res) => {
  let userId = req.params.userId;
  const email = req.body.email;
  console.log("userId", userId);
  console.log("email", email);
  try {
    // 1. Generate Token
    // console.log("generate token");
    const GET_USER_BY_ID = `SELECT * FROM users WHERE userId = ?;`;
    const [USER_BY_ID] = await database.execute(GET_USER_BY_ID, [userId]);
    console.log("USER_BY_ID: ", USER_BY_ID[0]);

    //bahan token
    let material1 = USER_BY_ID[0].userId;
    let material2 = USER_BY_ID[0].username;
    let material3 = USER_BY_ID[0].email;
    let material4 = USER_BY_ID[0].isVerified;

    //create token
    let token = createToken({ material1, material2, material3, material4 });
    console.log(token);

    // 2. Kirim email verification dengan nodemailer
    let mail = {
      from: "Admin <banquet.service2022@gmail.com",
      to: `${email}`,
      subject: "Banquet Account Verification",
      html: `<a href='http://localhost:3000/authentication/${token}'>Click here to verify your Banquet Account.</a>`,
    };

    console.log("after email setting");

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
  console.log("req.user : ", req.user);
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

module.exports.login = async (req, res) => {
  let err;
  const { credential, password } = req.body;
  console.log(credential, password);
  try {
    let FIND_USER = `SELECT * FROM users WHERE (username=${database.escape(
      credential
    )} AND password=${database.escape(password)}) OR (email=${database.escape(
      credential
    )} AND password=${database.escape(password)});`;
    console.log(FIND_USER);
    const [USER] = await database.execute(FIND_USER);
    if (!USER.length) {
      err = new Error("Error");
      err.statusCode = 500;
      err.message = "Gada bos";
      throw err;
    }
    console.log(USER);

    //bahan token
    let material1 = USER[0].userId;
    let material2 = USER[0].username;
    let material3 = USER[0].email;
    let material4 = USER[0].isVerified;

    //create token
    let token = createToken({ material1, material2, material3, material4 });
    console.log(token);
    console.log(material4);

    // if (material4 != 1) {
    //   err = new Error("Error");
    //   err.statusCode = 400;
    //   err.message = "Your account is not verified!";
    //   throw err;
    // }

    console.log("account is verified");

    res.status(200).send({
      dataLogin: USER[0],
      token,
      message: "Login success",
    });
  } catch (err) {
    res.status(err.statusCode).send(err.message);
  }
};

module.exports.edit = async (req, res) => {
  let err;
  const userId = req.params.userId;
  const body = req.body;
  console.log(userId, body);
  try {
    // 1. Check data apakah data user ada di dalam database
    const FIND_USER = `SELECT id FROM users WHERE userId = ${database.escape(
      userId
    )};`;

    console.log(FIND_USER);
    const [USER] = await database.execute(FIND_USER);
    if (!USER.length) {
      err = new Error("Error sini");
      err.statusCode = 500;
      err.message = "Gada user bos";
      throw err;
    }
    console.log(USER);

    // 2. Check apakah body memiliki inputan
    const isEmpty = !Object.keys(body).length;
    if (isEmpty) {
      err = new Error("Error sana");
      err.statusCode = 500;
      err.message = "Gada body bos";
      throw err;
    }

    // 3. Gunakan Joi untuk validasi data dari body
    const { error } = patchStudentSchema.validate(body);
    if (error) {
      err = new Error("Error");
      err.statusCode = 500;
      err.message = error.message;
      throw err;
    }

    // 4. Validasi apakah username unique
    const CHECK_USER = `SELECT id FROM users WHERE username = ? AND userId != ?`;
    const [USER_DATA] = await database.execute(CHECK_USER, [
      req.body.username,
      userId,
    ]);
    if (USER_DATA.length) {
      const err = new Error("Error");
      console.log(err);
      err.statusCode = 500;
      err.message = "Username already exists.";

      throw err;
    }

    //  5. Buat query untuk edit
    let query = [];
    for (let key in body) {
      query.push(`${key}='${body[key]}' `);
    }
    const EDIT_USER = `UPDATE users SET ${query} WHERE userId = ${database.escape(
      userId
    )};`;
    console.log(EDIT_USER);
    const [EDITED_USER] = await database.execute(EDIT_USER);
    console.log(EDITED_USER[0]);

    const FIND_UPDATED_USER = `SELECT * FROM users WHERE userId = ${database.escape(
      userId
    )};`;
    console.log(FIND_UPDATED_USER);
    const [UPDATED_USER] = await database.execute(FIND_UPDATED_USER);

    res.status(200).send({
      dataEdit: UPDATED_USER[0],
      message: "Edit success",
    });
  } catch (err) {
    res.status(err.statusCode).send(err.message);
  }
};

module.exports.uploadImage = (req, res) => {
  const userId = req.params.userId;
  console.log("mulai");
  try {
    let path = "/images";
    const upload = uploader(path, "IMG").fields([{ name: "file" }]);

    // Function untuk upload
    upload(req, res, (error) => {
      if (error) {
        console.log(error);
        res.status(500).send(error);
      }

      // Ini yang membawa file dari FE
      const { file } = req.files;
      console.log(file);
      // Membuat file path
      const filepath = file ? path + "/" + file[0].filename : null;
      console.log(filepath);

      let UPLOAD_IMAGE = `UPDATE users SET imageUrl=${databaseSync.escape(
        filepath
      )} WHERE userId = ${database.escape(userId)};`;
      console.log(UPLOAD_IMAGE);
      databaseSync.query(UPLOAD_IMAGE, (err, results) => {
        if (err) {
          console.log(err);
          fs.unlinkSync("./public" + filepath);
          res.status(500).send(err);
        }
        res
          .status(200)
          .send({ message: "Upload file success!", imageUrl: filepath });
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

module.exports.getImage = async (req, res) => {
  const userId = req.params.userId;
  try {
    // Select usernya
    const GET_IMAGE_BY_USERID = `SELECT imageUrl FROM users WHERE userId = ${database.escape(
      userId
    )};`;
    console.log("mulai");
    console.log(GET_IMAGE_BY_USERID);
    const [IMAGE] = await database.execute(GET_IMAGE_BY_USERID);

    res.status(200).send({
      imageUrl: IMAGE[0].imageUrl,
      message: "OK",
    });
  } catch (error) {
    res.status(404).send("Tidak ada isi");
  }
};
