const twilio = require('twilio');
const { logger } = require('./logger.config');
require('dotenv').config();

class TwilioConfig {
    static #client = null;
    static #config = null;

    static #getConfig() {
        this.#config = {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            phoneNumber: process.env.TWILIO_PHONE_NUMBER,
            whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER
        };
        return this.#config;
    }

    static initialize() {
        try {
            if (!this.#client) {
                const config = this.#getConfig();

                const missingCredentials = !config.accountSid || !config.authToken || !config.phoneNumber;

                if (missingCredentials) {
                    logger.error('Missing Twilio credentials. WhatsApp functionality will not work correctly.');
                    logger.error('Account SID:', config.accountSid ? 'Set' : 'Not set');
                    logger.error('Auth Token:', config.authToken ? 'Set' : 'Not set');
                    logger.error('Phone Number:', config.phoneNumber ? 'Set' : 'Not set');
                    return null;
                }

                logger.info('Initializing Twilio client for WhatsApp...', {
                    env: process.env.NODE_ENV || 'development',
                    accountSid: config.accountSid ? `${config.accountSid.substring(0, 8)}...` : 'not set',
                    phoneNumber: config.phoneNumber,
                    whatsappNumber: config.whatsappNumber
                });

                this.#client = twilio(config.accountSid, config.authToken);

                logger.info('Twilio client initialized successfully');
            }
            return this.#client;
        } catch (error) {
            logger.error('Error initializing Twilio configuration:', {
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    static getClient() {
        if (!this.#client) {
            return this.initialize();
        }
        return this.#client;
    }

    static getConfig() {
        if (!this.#config) {
            this.#getConfig();
        }
        return this.#config;
    }

    static isConfigured() {
        const config = this.getConfig();
        return !!(config.accountSid && config.authToken && config.phoneNumber);
    }
}

module.exports = TwilioConfig; 