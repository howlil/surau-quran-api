require("dotenv").config()
const jwt = require("jsonwebtoken")

class TokenUtil {
  static #jwtSecret = process.env.JWT_SECRET
  static #jwtExpire = '24h'

  static generateToken(userId) {
    const expireIn = this.#jwtExpire;

    try {
      const token = jwt.sign({ userId }, this.#jwtSecret, { expiresIn: expireIn })
      return token
    } catch {
      throw new Error("Failed to generate Token")
    }
  }

  static verifyToken(token) {
    try {

      const verify = jwt.verify(token, this.#jwtSecret)
      return verify

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token has expired")
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid Token")
      }
      throw new Error("Token Verification failed")
    }

  }

  static decodeToken(token) {
    try {
      const decode = jwt.decode(token)
      return decode

    } catch (error) {
      throw new Error("failed to decode token")
    }
  }

  static getTokenFromHeader(authHeader) {
    try {
      if (!authHeader) {
        throw new Error("authorization header is required")
      }
      if (!authHeader.startsWith('Bearer ')) {
        throw new Error("invalid authorization header format")
      }

      return authHeader.substring(7)


    } catch (error) {
      throw new Error("Invalid authorization header format")
    }
  }

  static isTokenExpired(token) {
    try {
      const decode = this.decodeToken(token)

      if (!decode.exp) {
        return true
      }

      const currentTime = Math.floor(Date.now() / 1000)

      return decode.exp < currentTime

    } catch (error) {
      return true
    }
  }

  static generatePasswordResetToken(userId) {
    try {
      const resetToken = require('./common.service.utils').generateRandomToken(32);

      const resetJwt = jwt.sign(
        {
          userId,
          type: 'password_reset',
          token: resetToken
        },
        this.#jwtSecret,
        { expiresIn: '30m' }
      );

      return resetJwt;
    } catch (error) {
      throw new Error("Failed to generate password reset token");
    }
  }

  static verifyPasswordResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.#jwtSecret);
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Password reset token has expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid password reset token");
      }
      throw error;
    }
  }

 

}

module.exports = TokenUtil