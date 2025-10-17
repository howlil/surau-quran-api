const express = require("express")
require("dotenv").config()
const errorMiddleware = require('./shared/middlewares/error.middleware');
const httpMiddleware = require("./shared/middlewares/http.middleware")
const logger = require('./shared/configs/logger.config');
const awilixConfig = require('./shared/configs/awilix.config');


class App {
    #app;

    constructor() {
        this.#app = express();
        this.plugin();
        this.startUp();
    }

    plugin() {
        this.#app.use(httpMiddleware);
        this.#app.use(express.json({ limit: '20mb', type: 'application/json', verify: (req, res, buf, encoding) => { req.rawBody = buf.toString(); } }));
        this.#app.use(express.urlencoded({ extended: true }))
        this.#app.use((req, res, next) => { req.container = awilixConfig.scope; next() });
        this.#app.use(require("./domain/route"))
        this.#app.use(errorMiddleware.expressErrorHandler); 

    }

    startUp() {
        const PORT = process.env.PORT
        this.#app.listen(PORT, () => {
            logger.info(`server Running in ${PORT}`)
        })
    }
}

module.exports = new App();
