const uuid = require("uuid");
const database = require("../config").promise();
const {
  registerUserSchema,
  patchUserSchema,
  loginUserSchema,
  resetPasswordUserSchema,
} = require("../helpers/validation-schema");
const { createToken } = require("../helpers/createToken");
const transporter = require("../helpers/nodemailer");
const databaseSync = require("../config");
const { uploader } = require("../helpers/uploader");
const fs = require("fs");
const bcrypt = require("bcrypt");
const createError = require("../helpers/createError");
const createResponse = require("../helpers/createResponse");
const httpStatus = require("../helpers/httpStatusCode");
const JWT = require("jsonwebtoken");
const otp_generator = require("otp-generator");

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

    delete USER[0].password;

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
  let response;
  const { username, email, password, repeat_password } = req.body;
  try {
    // 1. Validasi password apakah match dengan repeat password
    if (password != repeat_password) {
      throw new createError(
        httpStatus.Bad_Request,
        "Register failed",
        "The password doesn't match!"
      );
    }

    // 2. Validasi req.body, apakah sesuai dengan schema Joi
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
      throw new createError(
        httpStatus.Bad_Request,
        "Register failed",
        error.details[0].message
      );
    }

    // 3. Validasi apakah email dan username unique
    const CHECK_USER = `SELECT id FROM users WHERE username = ? OR email = ?`;
    const [USER_DATA] = await database.execute(CHECK_USER, [username, email]);
    if (USER_DATA.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Register failed",
        "Username or email already exists!"
      );
    }

    // 4. Create user ID
    const userId = uuid.v4();

    // 5. Password hashing
    const salt = await bcrypt.genSalt(10);
    console.log("salt : ", salt);

    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("plain : ", password);
    console.log("hash: ", hashedPassword);

    // 6. Store data user yang melakukan registrasi ke dalam database
    const INSERT_USER = `INSERT INTO users (userId, username, email, password) VALUES(${database.escape(
      userId
    )}, ${database.escape(username)}, ${database.escape(
      email
    )}, ${database.escape(hashedPassword)});
        `;
    const [USER_INSERTED] = await database.execute(INSERT_USER);
    // console.log(INFO);

    // 7. Fetch new user data
    const GET_USER_BY_ID = `
    SELECT * 
    FROM users 
    WHERE userId = ?; 
`;
    const [NEW_USER] = await database.execute(GET_USER_BY_ID, [userId]);

    delete NEW_USER[0].password;

    // 7. Generate token
    const token = otp_generator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });
    console.log("token :", token);

    // 8. Store token into our database
    const INSERT_TOKEN = `INSERT INTO tokens(userId, token) VALUES(${database.escape(
      userId
    )}, ${database.escape(token)});`;
    const [TOKEN_CREATED] = await database.execute(INSERT_TOKEN);
    console.log(TOKEN_CREATED);

    // 9. Send token with email
    let mail = {
      from: "Admin <banquet.service2022@gmail.com",
      to: `${email}`,
      subject: "Banquet Account Verification",
      html: `<p>please verify your account using this code.</p>
      <p>code : <b>${token}</b></p>
      <p>NOTE : do not share this code.</p>`,
    };

    transporter.sendMail(mail, (errMail, resMail) => {
      if (errMail) {
        throw new createError(
          httpStatus.Bad_Request,
          "Register failed",
          errMail
        );
      }
      response = new createResponse(
        httpStatus.OK,
        "Register success",
        "Please check your email and verify your account.",
        NEW_USER[0],
        ""
      );
      res.status(response.status).send(response);
    });
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.refreshToken = async (req, res) => {
  let response;
  const token = req.body.token;
  const userId = req.header("uid");
  console.log("masuk");
  try {
    // 1. Check token di dalam database
    const CHECK_TOKEN = `SELECT createdAt FROM tokens WHERE token = ? AND userId = ?;`;
    const [TOKEN] = await database.execute(CHECK_TOKEN, [token, userId]);
    if (!TOKEN.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Refresh token failed",
        "Invalid token."
      );
    }

    // 2. Check apakah token expired
    const now = new Date();
    // Ambil waktu saat ini
    const current = now.getTime();
    // Ambil waktu saat token dibuat
    const created = new Date(TOKEN[0].createdAt).getTime();
    const step = current - created;

    const remaining = Math.floor((30000 - step) / 1000); // milisecons
    // Jika selisih waktu buat dan waktu saat ini < 30s
    if (step <= 30000) {
      throw new createError(
        httpStatus.Bad_Request,
        "Refresh token failed",
        `Please wait for ${remaining}s to refresh the token.`
      );
    }

    // 3. Jika token exists dan waktu sudah lebih 30s, maka buat token baru
    const newToken = otp_generator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // 4. Update token di dalam database
    const UPDATE_TOKEN = `UPDATE tokens SET token = ?, createdAt = ? WHERE userId = ?;`;
    const [NEW_TOKEN] = await database.execute(UPDATE_TOKEN, [
      newToken,
      now,
      userId,
    ]);
    console.log(NEW_TOKEN.info);

    // 5. Ambil alamat email user
    const GET_EMAIL = `SELECT email FROM users WHERE userId = ?;`;
    const [EMAIL] = await database.execute(GET_EMAIL, [userId]);
    let email = EMAIL[0].email;

    // 6. Kirim token ke email
    let mail = {
      from: "Admin <banquet.service2022@gmail.com",
      to: `${email}`,
      subject: "Banquet Account Verification",
      html: `<p>please verify your account using this code.</p>
      <p>code : <b>${token}</b></p>
      <p>NOTE : do not share this code.</p>`,
    };

    transporter.sendMail(mail, (errMail, resMail) => {
      if (errMail) {
        throw new createError(
          httpStatus.Bad_Request,
          "Update token failed failed",
          ""
        );
      }
      response = new createResponse(
        httpStatus.OK,
        "Token updated",
        "Please check your email for the updated token.",
        "",
        ""
      );
      res.status(response.status).send(response);
    });
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
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
    let materialToken = USER_BY_ID[0].userId;
    // let material2 = USER_BY_ID[0].username;
    // let material3 = USER_BY_ID[0].email;
    // let material4 = USER_BY_ID[0].isVerified;

    //create token
    let token = createToken({ materialToken });
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
        // console.log(errMail);
        // res.status(500).send({
        //   message: "Registration failed!",
        //   success: false,
        //   err: errMail,
        // });
        throw new createError(
          httpStatus.Internal_Server_Error,
          "Operation Error",
          "Email verification is failed to send."
        );
      }
      // res.status(200).send({
      //   message:
      //     "Registration success, check your email for account verification",
      //   success: true,
      // });
      const response = new createResponse(
        httpStatus.OK,
        "Email verification is sent",
        "Please check your email and verify your account.",
        "",
        ""
      );

      res.status(response.status).send(response);
    });

    // res.status(200).send("<h1>List of users</h1>");
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.verification = async (req, res) => {
  // req.user didapat dari proses decoding di authToken.js dimana token diubah kembali menjadi data awalnya
  const { materialToken } = req.user;
  try {
    let UPDATE_USER_VERIFICATION = `UPDATE users SET isVerified=1 WHERE userId=${database.escape(
      materialToken
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
    console.log("masuk try");
    // 1. Validasi credential dan password berdasarkan schema
    const { error } = loginUserSchema.validate(req.body);
    if (error) {
      // err = new Error("Error");
      // err.statusCode = 500;
      // err.message = "Salah format input";
      // throw err;
      console.log(error.details[0].message);
      throw new createError(
        httpStatus.Bad_Request,
        "Log in failed",
        error.details[0].message
      );
    }

    console.log("Pass check 1");

    // 2. Check apakah username atau email exist di dalam database
    let FIND_USER = `SELECT * FROM users WHERE username=${database.escape(
      credential
    )} OR email=${database.escape(credential)};`;
    console.log(FIND_USER);
    const [USER] = await database.execute(FIND_USER);
    console.log(USER);
    if (!USER.length) {
      // err = new Error("Error");
      // err.statusCode = 500;
      // err.message = "Credential tidak ditemukan";
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Log in failed",
        "Username or email is not registered!"
      );
    }
    console.log(USER);

    // 3. Jika user exist, validasi passwordnya
    const isValid = await bcrypt.compare(password, USER[0].password);
    if (!isValid) {
      // err = new Error("Error");
      // err.statusCode = 500;
      // err.message = "Password salah";
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Log in failed",
        "Invalid password!"
      );
    }

    //bahan token
    let materialToken = USER[0].userId;
    // let material2 = USER[0].username;
    // let material3 = USER[0].email;
    // let material4 = USER[0].isVerified;

    //create token
    let token = createToken({ materialToken });
    console.log(token);

    // if (material4 != 1) {
    //   err = new Error("Error");
    //   err.statusCode = 400;
    //   err.message = "Your account is not verified!";
    //   throw err;
    // }

    console.log("account is verified");
    delete USER[0].password;

    const response = new createResponse(
      httpStatus.OK,
      "Login success",
      "Welcome back!",
      USER[0],
      token
    );

    res
      .header("Auth-Token", `Bearer ${token}`)
      .status(response.status)
      .send(response);

    // res.status(200).send({
    //   dataLogin: USER[0],
    //   token,
    //   message: "Login success",
    // });
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
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
      // err = new Error("Error sini");
      // err.statusCode = 500;
      // err.message = "Gada user bos";
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Edit failed",
        "User ID is not registered!"
      );
    }
    console.log(USER);

    // 2. Check apakah body memiliki inputan
    const isEmpty = !Object.keys(body).length;
    if (isEmpty) {
      // err = new Error("Error sana");
      // err.statusCode = 500;
      // err.message = "Gada body bos";
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Edit failed",
        "Your form is incomplete!"
      );
    }

    // 3. Gunakan Joi untuk validasi data dari body
    const { error } = patchUserSchema.validate(body);
    if (error) {
      // err = new Error("Error");
      // err.statusCode = 500;
      // err.message = error.message;
      // throw err;
      console.log(error.details[0].message);
      throw new createError(
        httpStatus.Bad_Request,
        "Edit failed",
        error.details[0].message
      );
    }

    // 4. Validasi apakah username unique
    const CHECK_USER = `SELECT id FROM users WHERE username = ? AND userId != ?`;
    const [USER_DATA] = await database.execute(CHECK_USER, [
      req.body.username,
      userId,
    ]);
    if (USER_DATA.length) {
      // const err = new Error("Error");
      // console.log(err);
      // err.statusCode = 500;
      // err.message = "Username already exists.";

      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Edit failed",
        "Username already exists!"
      );
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

    // res.status(200).send({
    //   dataEdit: UPDATED_USER[0],
    //   message: "Edit success",
    // });
    const response = new createResponse(
      httpStatus.OK,
      "Edit profile success",
      "Profile changes saved successfully!",
      UPDATED_USER[0],
      ""
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
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
        // res.status(500).send(error);
        throw new createError(httpStatus.Bad_Request, "Upload failed", error);
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
          // res.status(500).send(err);
          throw new createError(httpStatus.Bad_Request, "Upload failed", err);
        }
        // res
        //   .status(200)
        //   .send({ message: "Upload file success!", imageUrl: filepath });
        const response = new createResponse(
          httpStatus.OK,
          "Edit profile success",
          "Upload image success!",
          filepath,
          ""
        );

        res.status(response.status).send(response);
      });
    });
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
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

module.exports.resetPasswordRequest = async (req, res) => {
  const { email } = req.body;
  try {
    // 1. Validasi req.body, apakah sesuai dengan schema Joi
    const { error } = resetPasswordUserSchema.validate(req.body);
    console.log("masuk joi");
    if (error) {
      // const err = new Error("Error");
      // err.statusCode = 500;
      // err.message = error.details[0].message;
      // console.log(error.details);
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Log in failed",
        error.details[0].message
      );
    }

    // 2. Validasi apakah email exist
    const CHECK_EMAIL = `SELECT * FROM users WHERE email =${database.escape(
      email
    )};`;
    console.log(CHECK_EMAIL);
    const [USER_BY_EMAIL] = await database.execute(CHECK_EMAIL, [email]);
    console.log(USER_BY_EMAIL);

    if (!USER_BY_EMAIL.length) {
      // const err = new Error("Error");
      // console.log(err);
      // err.statusCode = 500;
      // err.message = "Email didn't exist.";

      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Reset password request failed",
        "Your email is not registered."
      );
    }

    // 3. Generate Token
    //bahan token
    let materialToken = USER_BY_EMAIL[0].userId;
    // let material2 = USER_BY_EMAIL[0].username;
    // let material3 = USER_BY_EMAIL[0].email;
    // let material4 = USER_BY_EMAIL[0].isVerified;

    //create token
    let token = createToken({ materialToken });
    console.log(token);

    // 8. Kirim email verification dengan nodemailer
    let mail = {
      from: "Admin <banquet.service2022@gmail.com",
      to: `${email}`,
      subject: "Reset Password for Banquet Account",
      html: `<a href='http://localhost:3000/reset-password/${token}'>Click here to reset your Banquet Account password.</a>`,
    };

    transporter.sendMail(mail, (errMail, resMail) => {
      if (errMail) {
        console.log(errMail);
        // res.status(500).send({
        //   message: "Reset password failed!",
        //   success: false,
        //   err: errMail,
        // });
        throw new createError(
          httpStatus.Bad_Request,
          "Reset password request failed",
          errMail
        );
      }
      // res.status(200).send({
      //   message: "Please reset your password",
      //   success: true,
      // });\

      const response = new createResponse(
        httpStatus.OK,
        "Reset password request",
        "Please check your email and reset your password.",
        "",
        ""
      );

      res.status(response.status).send(response);
    });

    // res.status(200).send("<h1>List of users</h1>");
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.resetPasswordConfirmation = async (req, res) => {
  // req.user didapat dari proses decoding di authToken.js dimana token diubah kembali menjadi data awalnya
  const { materialToken } = req.user;
  const { password } = req.body;
  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    console.log("salt : ", salt);

    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("plain : ", password);
    console.log("hash: ", hashedPassword);

    let UPDATE_USER_PASSWORD = `UPDATE users SET password=${database.escape(
      hashedPassword
    )} WHERE userId=${database.escape(materialToken)};`;
    console.log(UPDATE_USER_PASSWORD);
    const [UPDATED_USER] = await database.execute(UPDATE_USER_PASSWORD);
    console.log(UPDATED_USER[0]);
    res.status(200).send({
      message: "Password change success.",
    });
  } catch (err) {
    res.status(err.statusCode).send(err);
  }
};

module.exports.retrieveData = async (req, res) => {
  console.log("masuk retrieveData");
  const { materialToken } = req.user;
  // const uid = req.uid
  console.log(req.user);
  try {
    const GET_USER = `SELECT * FROM users WHERE userId = ?;`;
    const [USER] = await database.execute(GET_USER, [materialToken]);

    delete USER[0].password;

    const response = new createResponse(
      httpStatus.OK,
      "Retrieve data success",
      "User data is retrieved.",
      USER[0],
      ""
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};
