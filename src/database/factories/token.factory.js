const jwt = require('jsonwebtoken');

class TokenFactory {
    static create(userId) {
        // Generate JWT token (realistic authentication token)
        const payload = {
            userId,
            timestamp: Date.now(),
            randomId: Math.random().toString(36).substring(7)
        };

        const token = jwt.sign(payload, 'test-secret-key', { expiresIn: '7d' });

        return {
            userId,
            token
        };
    }

    static createExpired(userId) {
        // Generate expired token
        const payload = {
            userId,
            timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
            randomId: Math.random().toString(36).substring(7)
        };

        const token = jwt.sign(payload, 'test-secret-key', { expiresIn: '7d' });

        return {
            userId,
            token
        };
    }

    static createRefreshToken(userId) {
        // Generate longer refresh token
        const payload = {
            userId,
            type: 'refresh',
            timestamp: Date.now(),
            randomId: Math.random().toString(36).substring(7)
        };

        const token = jwt.sign(payload, 'test-secret-key', { expiresIn: '30d' });

        return {
            userId,
            token
        };
    }
}

module.exports = TokenFactory; 