require('dotenv').config();
const express = require('express');
const { logger } = require('./src/lib/config/logger.config');
const EnvironmentConfig = require('./src/lib/config/env.config');
const Http = require('./src/lib/http');
const loggerMiddleware = require('./src/app/middleware/logger.middleware');
const SecurityMiddleware = require('./src/app/middleware/security.middleware');

const { prismaConfig } = require('./src/lib/config/prisma.config');
const routes = require('./src/app/routes');


class Application {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.app.set('trust proxy', 1);
  }

  setupMiddleware() {
    SecurityMiddleware.setup(this.app);

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(loggerMiddleware);
  }

  setupRoutes() {
    this.app.use('/api', routes);

    this.app.get('/', (req, res) => {
      Http.Response.success(res, { status: 'ok', timestamp: new Date() }, 'API is running');
    });
  }

  setupErrorHandling() {
    Http.setupErrorHandling(this.app);
  }


  async connectDatabase() {
    try {
      await prismaConfig.connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  validateEnvironment() {
    try {
      EnvironmentConfig.validateEnv();
    } catch (error) {
      logger.error('Environment validation failed:', error);
      throw error;
    }
  }

  async start() {
    try {
      // Validate environment variables first
      this.validateEnvironment();

      // Then connect to database
      await this.connectDatabase();

      this.server = this.app.listen(this.port, () => {
        logger.info(`Server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
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
          logger.info('HTTP server closed');

          prismaConfig.disconnect()
            .then(() => {
              logger.info('Database connection closed');
              process.exit(0);
            })
            .catch((error) => {
              logger.error('Error closing database connection:', error);
              process.exit(1);
            });
        });

        setTimeout(() => {
          logger.error('Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
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