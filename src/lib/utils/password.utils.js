const bcyrpt = require("bcrypt")

class Passwordutil {
  static #salt = 10

  static async hashPassword(password) {
    return await bcyrpt.hash(password, this.#salt)
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcyrpt.compare(password, hashedPassword)
  }
}

module.exports = Passwordutil