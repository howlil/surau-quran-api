const RequestHttp = require("../../lib/http/request.http")
const logger = require("../../lib/config/logger.config")


module.exports = function httpMiddleware(req, res, next) {
    req.extract = new RequestHttp(req)

    const time = Date.now()

    logger.http(`${req.method} - ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString()
    })


    res.on('finish', () => {
        const duration = Date.now() - time
        logger.http(`${req.method} ${req.url} - ${res.statusCode}`, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString()
        })
    })

    next()
}