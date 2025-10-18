const express = require("express");
require("dotenv").config();
const path = require('path');
const errorMiddleware = require('./app/middleware/error.middleware');
const httpMiddleware = require('./app/middleware/http.middleware');
const logger = require('./lib/config/logger.config');
const CronJobs = require('./lib/config/cronjob.config');

class App {
    #app;

    constructor() {
        this.#app = express();
        this.plugin();
        this.startUp();
    }

    plugin() {
        this.#app.use(httpMiddleware)
        this.#app.use(express.json({ limit: '20mb', type: 'application/json', verify: (req, res, buf, encoding) => { req.rawBody = buf.toString(); } }));
        this.#app.use(express.urlencoded({ extended: true }));
        this.#app.use('/uploads', express.static(path.resolve('uploads')));
        this.#app.use("/api", require("./app/routes"));
        this.#app.use(errorMiddleware.expressErrorHandler);
    }

    async startUp() {
        try {
            this.setupCronJobs();
            const PORT = process.env.PORT;
            this.#app.listen(PORT, () => {
                logger.info(`Server running on port ${PORT}`);
                logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            });

        } catch (error) {
            logger.error('Startup failed:', error);
            process.exit(1);
        }
    }

    setupCronJobs() {
        try {
            CronJobs.init();
        } catch (error) {
            logger.error('Failed to initialize cron jobs:', error);
        }
    }


}

module.exports = new App();
