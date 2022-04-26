const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // user: "banquet.service2022@gmail.com",
    // pass: "wbnifqdvpgkkssbb",
    user: "winaldo.code@gmail.com",
    pass: "hfygryoidyrryqsy",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
