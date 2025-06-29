const { v4: uuidv4 } = require('uuid');

class PasswordResetTokenFactory {
    static create(userId) {
        // Generate random token (biasanya 32-64 karakter)
        const token = require('crypto').randomBytes(32).toString('hex');

        // Token expires in 1 hour (standar untuk reset password)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        return {
            token,
            userId,
            expiresAt
        };
    }

    static createExpired(userId) {
        const token = require('crypto').randomBytes(32).toString('hex');

        // Token sudah expired (1 hari yang lalu)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() - 1);

        return {
            token,
            userId,
            expiresAt
        };
    }
}

module.exports = PasswordResetTokenFactory; 