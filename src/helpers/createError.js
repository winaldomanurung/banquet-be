const httpStatus = require("./httpStatusCode");

class NewError {
  constructor(
    httpStatusCode = httpStatus.Internal_Server_Error,
    subject = "Operation error.",
    message = "Internal service error."
  ) {
    this.status = httpStatusCode;
    this.subject = subject;
    this.message = message;
  }
}

module.exports = NewError;
