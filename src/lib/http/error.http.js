class ErrorHttp extends Error {
  constructor( statusCode, message, name) {
      super(message);
      this.statusCode = statusCode;
      this.message = message;
      this.name = name;
  }
}

module.exports = ErrorHttp;