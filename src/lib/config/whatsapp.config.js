const { logger } = require('./logger.config');
require('dotenv').config();

class WhatsappConfig {
    static #client = null;
    static #config = null;

    static #buildConfig() {
        const cfg = {
            token: process.env.WHATSAPP_TOKEN,
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            graphVersion: 'v22.0',
            baseUrl: 'https://graph.facebook.com',
            defaultSender: process.env.WHATSAPP_SENDER ,
        };
        this.#config = cfg;
        return cfg;
    }

    static initialize() {
        if (this.#client) return this.#client;

        const cfg = this.#buildConfig();
        const missing = ['token', 'phoneNumberId'].filter(k => !cfg[k]);
        if (missing.length) {
            logger.error(`Missing WhatsApp config: ${missing.join(', ')}`);
            return null;
        }

        logger.info('Initializing WhatsApp Cloud API client...', {
            env: process.env.NODE_ENV || 'development',
            version: cfg.graphVersion
        });

        // Simple wrapper di atas fetch untuk POST ke Graph API
        this.#client = async (endpoint, body) => {
            const url = `${cfg.baseUrl}/${cfg.graphVersion}/${cfg.phoneNumberId}${endpoint}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cfg.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const err = new Error(`WhatsApp API error ${res.status}`);
                err.details = data;
                throw err;
            }
            return data;
        };

        logger.info('WhatsApp Cloud API client initialized');
        return this.#client;
    }

    static getClient() {
        return this.initialize();
    }

    static getConfig() {
        return this.#config || this.#buildConfig();
    }

    static isConfigured() {
        const { token, phoneNumberId } = this.getConfig();
        return Boolean(token && phoneNumberId);
    }
}

module.exports = WhatsappConfig;
