const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "banquet.service2022@gmail.com",
    pass: "zqzwzmibbdvgexnz",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
