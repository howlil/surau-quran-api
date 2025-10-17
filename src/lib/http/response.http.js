
class ResponseHttp {

  constructor(statusCode, message, data = null, meta = null) {
      this.statusCode = statusCode;
      this.message = message;
      this.data = data;
      this.meta = meta;

  }

  send(res) {
      const responseBody = {
          success: this.statusCode < 400,
          message: this.message,
      }

      if (this.data !== null && this.data !== undefined) {
          responseBody.data = this.data
      }

      if (this.meta !== null && this.meta !== undefined) {
          responseBody.meta = this.meta
      }

      return res.status(this.statusCode).json(responseBody);
  }

}

module.exports = ResponseHttp;