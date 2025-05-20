const { logger } = require('./logger.config');

class EnvironmentConfig {
    static validateEnv() {
        logger.info('Validating environment variables...');

        const requiredVars = [
            // Database
            'DATABASE_URL',

            // Auth
            'JWT_SECRET',
            'JWT_EXPIRES_IN',

            // Xendit API
            'XENDIT_SECRET_KEY',
            'XENDIT_CALLBACK_TOKEN',
        ];

        const missingVars = [];

        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        logger.info('Environment validation successful');
    }
}

module.exports = EnvironmentConfig; 