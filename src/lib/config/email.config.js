const nodemailer = require('nodemailer');
const { logger } = require('./logger.config');

class EmailConfig {
    static #transporter = null;
    static #config = null;

    static #getConfig() {
        this.#config = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD 
            },
            from: process.env.SMTP_FROM || process.env.SMTP_USER // Fallback to SMTP_USER if SMTP_FROM not set
        };
        return this.#config;
    }

    static initialize() {
        try {
            if (!this.#transporter) {
                const config = this.#getConfig();
                
                const missingCredentials = !config.auth?.user || !config.auth?.pass;
                
                if (missingCredentials) {
                    logger.error('Missing SMTP credentials. Email functionality will not work correctly.');
                    logger.error('User:', config.auth?.user ? 'Set' : 'Not set');
                    logger.error('Password:', config.auth?.pass ? 'Set' : 'Not set');
                }
                
                logger.info('Initializing SMTP transporter for environment:', {
                    env: process.env.NODE_ENV || 'development',
                    host: config.host,
                    port: config.port,
                    secure: config.secure,
                    from: config.from,
                    user: config.auth?.user ? `${config.auth.user.substring(0, 3)}...` : 'not set'
                });
                
                // Configure transport options
                const transportOptions = {
                    host: config.host,
                    port: config.port,
                    secure: config.secure,
                    auth: {
                        user: config.auth.user,
                        pass: config.auth.pass
                    },
                    tls: {
                        rejectUnauthorized: false // Only for development
                    }
                };
                
                this.#transporter = nodemailer.createTransport(transportOptions);
                
                // Verify connection configuration
                this.#transporter.verify((error, success) => {
                    if (error) {
                        logger.error('SMTP connection error:', {
                            error: error.message,
                            stack: error.stack
                        });
                    } else {
                        logger.info('SMTP server is ready to send emails');
                    }
                });
            }
            return this.#transporter;
        } catch (error) {
            logger.error('Error initializing email configuration:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    static getTransporter() {
        if (!this.#transporter) {
            this.initialize();
        }
        return this.#transporter;
    }

    static getFromAddress() {
        return this.#getConfig().from;
    }


}

module.exports = EmailConfig;