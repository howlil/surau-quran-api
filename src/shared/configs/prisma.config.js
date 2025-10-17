const { PrismaClient } = require('@prisma/client');
const logger = require('../configs/logger.config');
const globalUtils = require('../utils/global.util');

class PrismaConfig {

    constructor() {
        this.prisma = this.#createPrismaClient();
        this.#setupLogging(this.prisma);
    }

    #createPrismaClient() {
        return new PrismaClient({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'info' },
                { emit: 'event', level: 'warn' },
                { emit: 'event', level: 'error' }
            ],
            errorFormat: globalUtils.isDevelopment ? 'pretty' : 'colorless',

            datasources : {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
    }

    #setupLogging(prisma) {
        if (globalUtils.isDevelopment) {
            prisma.$on('query', (e) => {
                logger.debug(`Query: ${e.query}`);
                logger.debug(`Params: ${e.params}`);
                logger.debug(`Duration: ${e.duration}ms`);
            });
        }
        prisma.$on('info', (e) => {
            logger.info(e.message);
        }
        );
        prisma.$on('warn', (e) => {
            logger.warn(e.message);
        });
        prisma.$on('error', (e) => {
            logger.error(e.message);
        });
    }

    async connect() {
        try {
            await this.prisma.$connect();
        } catch (error) {
            logger.error(`Error connecting to the database: ${error.message}`);
        }
    }

    async disconnect() {
        try {
            await this.prisma.$disconnect();
        } catch (error) {
            logger.error(`Error disconnecting from the database: ${error.message}`);
        }   
    }

    getClient() {
        return this.prisma;
    }

}

module.exports = new PrismaConfig().getClient();