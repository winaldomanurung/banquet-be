const httpStatus = require("./httpStatusCode");

class NewError {
  constructor(
    httpStatusCode = httpStatus.OK,
    subject = "Operation success",
    message = "OK",
    dataUser = {},
    token = ""
  ) {
    (this.status = httpStatusCode),
      (this.subject = subject),
      (this.message = message),
      (this.dataUser = dataUser);
    this.token = token;
  }
}

module.exports = NewError;
