
require('dotenv').config();
const express = require('express');
const { logger } = require('./src/lib/config/logger.config');
const Http = require('./src/lib/http');
const loggerMiddleware = require('./src/app/middleware/logger.middleware');



class Application {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(loggerMiddleware);
  }

  setupRoutes() {

    this.app.get('/', (req, res) => {
      Http.Response.success(res, { status: 'ok', timestamp: new Date() }, 'API is running');
    });
  }

  setupErrorHandling() {
    Http.setupErrorHandling(this.app);
  }


  async connectDatabase() {
    try {

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }


  async start() {
    try {
      await this.connectDatabase();

      this.server = this.app.listen(this.port, () => {
        logger.info(`Server running on port ${this.port}`);
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      logger.info('Shutting down server...');
      if (this.server) {
        this.server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown();
    });
  }
}

const app = new Application();
app.start();

module.exports = app;