const { prisma } = require('../../lib/config/prisma.config');
const { UnauthorizedError, ConflictError } = require('../../lib/http/errors.http');
const { logger } = require('../../lib/config/logger.config');
const TokenUtils = require('../../lib/utils/token.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const CONSTANT = require('../../lib/constants/enum');

class AuthService {
    async login(email, password) {
        try {
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw new UnauthorizedError('Email atau password salah');
            }

            const isValidPassword = await PasswordUtils.verify(password, user.password);

            if (!isValidPassword) {
                throw new UnauthorizedError('Email atau password salah');
            }

            const token = await TokenUtils.generateToken(user.id);

            return { token, user: { id: user.id, email: user.email, role: user.role } };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    async logout(token) {
        try {
            return await TokenUtils.revokeToken(token);
        } catch (error) {
            logger.error('Logout error:', error);
            throw error;
        }
    }

   
}

module.exports = new AuthService();