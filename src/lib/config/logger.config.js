const winston = require('winston');
const { format, transports, createLogger } = winston;
const path = require('path');
const fs = require('fs');

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

    this.developmentFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.colorize({ all: true }),
      format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
    );

    this.productionFormat = format.combine(
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

 
  getFormat() {
    const env = process.env.NODE_ENV || 'development';
    return env === 'production' ? this.productionFormat : this.developmentFormat;
  }

  getTransports() {
    const env = process.env.NODE_ENV || 'development';
    
    const consoleTransport = new transports.Console({
      level: this.getLogLevel()
    });

    if (env === 'production') {
      return [
        consoleTransport,
        
        new transports.File({
          filename: path.join(logDirectory, 'combined.log'),
          level: 'info',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        
        new transports.File({
          filename: path.join(logDirectory, 'errors.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),

        new transports.File({
          filename: path.join(logDirectory, 'http.log'),
          level: 'http',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      ];
    }

    return [consoleTransport];
  }


  createLogger() {
    const logger = createLogger({
      level: this.getLogLevel(),
      levels: this.levels,
      format: this.getFormat(),
      transports: this.getTransports(),
      exitOnError: false // Jangan exit pada uncaught exceptions
    });

    // Tambahkan stream untuk morgan
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