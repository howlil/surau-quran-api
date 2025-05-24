const winston = require('winston');
const { format, transports, createLogger } = winston;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

class LoggerConfig {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6
    };

    this.colors = {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      verbose: 'cyan',
      debug: 'blue',
      silly: 'gray'
    };

    winston.addColors(this.colors);

    // Format utk console (warna-warni)
    this.consoleFormat = format.combine(
      format.colorize({ all: true }),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(info => {
        // Handle multiple arguments ("splat") supaya semua argumen kelihatan
        const splat = info[Symbol.for('splat')];
        let msg = info.message;
        if (splat) {
          msg += ' ' + splat.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
          ).join(' ');
        }
        return `${info.timestamp} ${info.level}: ${msg}${info.stack ? '\n' + info.stack : ''}`;
      })
    );

    // Format utk file (tanpa warna, lebih rapi)
    this.fileFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(info => {
        // Splat handle biar banyak argumen bisa ikut ke log
        const splat = info[Symbol.for('splat')];
        let msg = info.message;
        if (splat) {
          msg += ' ' + splat.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
          ).join(' ');
        }
        return `${info.timestamp} ${info.level}: ${msg}${info.stack ? '\n' + info.stack : ''}`;
      })
    );

    this.jsonFileFormat = format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    );

    this.logger = this.createLogger();
  }

  getLogLevel() {
    const env = process.env.NODE_ENV || 'development';
    return env === 'production' ? 'info' : 'debug';
  }

  createLogger() {
    const env = process.env.NODE_ENV || 'development';

    const transportList = [
      // Console pake format warna-warni
      new transports.Console({
        level: this.getLogLevel(),
        format: this.consoleFormat,
      }),
      // File log (tanpa warna)
      new transports.File({
        filename: path.join(logDirectory, 'combined.log'),
        level: 'debug',
        format: this.fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new transports.File({
        filename: path.join(logDirectory, 'warn.log'),
        level: 'warn',
        format: this.fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new transports.File({
        filename: path.join(logDirectory, 'info.log'),
        level: 'info',
        format: this.fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new transports.File({
        filename: path.join(logDirectory, 'errors.log'),
        level: 'error',
        format: this.fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new transports.File({
        filename: path.join(logDirectory, 'http.log'),
        level: 'http',
        format: this.fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ];

    const logger = createLogger({
      level: this.getLogLevel(),
      levels: this.levels,
      transports: transportList,
      exitOnError: false
    });

    logger.stream = {
      write: (message) => {
        logger.http(message.trim());
      }
    };

    return logger;
  }

  getLogger() {
    return this.logger;
  }

  static getInstance() {
    if (!LoggerConfig.instance) {
      LoggerConfig.instance = new LoggerConfig();
    }
    return LoggerConfig.instance;
  }
}

LoggerConfig.instance = null;

module.exports = {
  logger: LoggerConfig.getInstance().getLogger(),
  stream: LoggerConfig.getInstance().getLogger().stream
};
