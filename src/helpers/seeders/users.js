const database = require("../config").promise();
const bcrypt = require("bcrypt");

var data = [
  {
    userId: "E48DEF4A-9965-744C-B644-5CD316CF2165",
    username: "Cedric",
    fullname: "Camilla Sheng",
    email: "elit.pretium@google.com",
  },
  {
    userId: "64248E31-FD26-794E-14AC-B2C9BA2AEDCC",
    username: "Keith",
    fullname: "Nevada Teoh",
    email: "amet.consectetuer@outlook.com",
  },
  {
    userId: "3B526B9E-6962-1136-5E55-242BB854EE55",
    username: "Aladdin",
    fullname: "Jane Subramanian",
    email: "massa.rutrum@yahoo.com",
  },
  {
    userId: "C81D7B48-B68B-045C-5162-226049A1C145",
    username: "Nerea",
    fullname: "Avram Loo",
    email: "aliquet.molestie@outlook.com",
  },
  {
    userId: "29E2A575-F53E-2E22-7FDE-C3625B302B4A",
    username: "Giacomo",
    fullname: "Flynn Leow",
    email: "integer.sem.elit@yahoo.com",
  },
  {
    userId: "D2333756-A64F-9A8B-A22F-251329472E13",
    username: "Raja",
    fullname: "Reed Chong",
    email: "lacus.etiam@yahoo.com",
  },
  {
    userId: "E4C990C6-8F16-6C7A-4CE3-B483BAF02C52",
    username: "Berk",
    fullname: "Kuame Li",
    email: "eget.magna.suspendisse@outlook.com",
  },
  {
    userId: "47A79205-2912-EE3E-603B-1A6159E485E9",
    username: "Nayda",
    fullname: "Leroy Ko",
    email: "sed.nunc.est@yahoo.com",
  },
  {
    userId: "B48D665E-6491-5EF6-CD57-2E8299259655",
    username: "Daquan",
    fullname: "Stuart Sharma",
    email: "neque@yahoo.com",
  },
  {
    userId: "2774D054-F36A-72CB-1B4E-15F9CE62792E",
    username: "Barbara",
    fullname: "Imogene Poon",
    email: "ullamcorper@yahoo.com",
  },
  {
    userId: "E5E410C9-65C4-C79D-9E36-DA6ADBEE8446",
    username: "Vernon",
    fullname: "Cynthia Khoo",
    email: "curabitur.ut.odio@outlook.com",
  },
  {
    userId: "ECEA878F-B879-5D24-4DD6-C654BE755CBE",
    username: "Iona",
    fullname: "Forrest Phang",
    email: "augue.eu@outlook.com",
  },
  {
    userId: "ECEF77D1-7BB1-31B7-7B6B-7F2D24A6B6DE",
    username: "Robert",
    fullname: "Baker Xiong",
    email: "tempus.risus@outlook.com",
  },
  {
    userId: "ADE47EC8-F513-F94B-8E86-95DEB378CCE9",
    username: "Jena",
    fullname: "Oscar Cao",
    email: "accumsan.neque@google.com",
  },
  {
    userId: "E45BB927-7CF8-ACEB-DD2B-BFA3EEAC1CE1",
    username: "Branden",
    fullname: "Gage Lian",
    email: "elit.sed@yahoo.com",
  },
];

// const salt = await bcrypt.genSalt(10);
// const hashedPassword = await bcrypt.hash("Admin123@", salt);

for (let i; i < data.length; i++) {
  const INSERT_USER = `INSERT INTO users (userId, username, email, password, isVerified) VALUES(data[${i}].userId, data[${i}].username, data[${i}].email, '$2b$10$TEq9f7Y.XceVaMBk6Kc0ruejn9yo.tkMxh9sTh6Hd/GIK4KeosS62', 1);
      `;
  const [INFO] = database.execute(INSERT_USER);
}
