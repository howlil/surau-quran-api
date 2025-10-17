const winston = require('winston');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const globalUtils = require('../utils/global.util');

class LoggerConfig {
    static levels = {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 5
    };

    static colors = {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
    };

    constructor() {
        winston.addColors(LoggerConfig.colors);
        this.logger = this.#createLogger();
    }

    #createLogger() {
        return this.logger = createLogger({
            levels: this.levels,
            transports: this.#getTransports(),
            exitOnError: false
        });
    }

    #fileFormat() {
        return format.combine(
            format.timestamp({ format: ' HH:mm:ss DD-MM-YYYY' }),
            format.json(),
            format.errors({ stack: true }),
        );
    }

    #consoleFormat() {
        return combine(
            colorize({ all: true }),
            timestamp({ format: ' HH:mm:ss DD-MM-YYYY' }),
            format.errors({ stack: true }),
            printf(({ timestamp, level, message, stack }) => {
                return `${timestamp} ${level}: ${stack || message}`;
            })
        );
    }

    #getTransports() {
        const transportsList = [
            new transports.Console({
                format: this.#consoleFormat(),  
                level: this.#getLogLevel(),
            }),
            
            new transports.File({
                filename: 'logs/info/app.log',
                format: this.#fileFormat(),  
                level: 'info',
            }),
            
            new transports.File({
                filename: 'logs/errors/error.log',
                format: this.#fileFormat(),    
                level: 'error',
            }),
            
            new transports.File({
                filename: 'logs/info/http.log',
                format: this.#fileFormat(),   
                level: 'http',
            }),
        ]
        return transportsList;
    }

    #getLogLevel() {
        return globalUtils.isDevelopment ? 'debug' : 'info';
    }


    getLogger() {
        return this.logger;
    }
}

module.exports = new LoggerConfig().getLogger();