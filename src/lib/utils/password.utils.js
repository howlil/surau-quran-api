const bcrypt = require('bcrypt');
const { AUTH } = require('../constants');

class PasswordUtils {
  static #saltRounds = AUTH.SALT_ROUNDS;

  static async hash(password) {
    return await bcrypt.hash(password, this.#saltRounds);
  }

  static async verify(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static generateRandomPassword(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    
    return password;
  }
}

module.exports = PasswordUtils;