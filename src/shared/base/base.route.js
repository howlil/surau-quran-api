const { Router } = require("express")
const { makeInvoker } = require("awilix-express")
const validationMiddleware = require("../middlewares/validation.middleware")

class BaseRoute {
    constructor(controllerName) {
        if (this.constructor === BaseRoute) {
            throw new Error("BaseRoute cannot be instantiated directly");
        }
        this.router = Router()
        this.api = makeInvoker(controllerName)
        this.validation = validationMiddleware 
        this.createRoute()

    }

    static getInstance(controllerName) {
        if (!this.instance) {
            this.instance = new this(controllerName)
        }
        return this.instance
    }

    createRoute() {
        throw new Error("createRoute method must be implemented by subclass")
    }

    get(path, method, ...middlewares) {
        this.router.get(path, ...middlewares, this.api(method))
        return this
    }

    post(path, method, ...middlewares) {
        this.router.post(path, ...middlewares, this.api(method))
        return this
    }

    patch(path, method, ...middlewares) {
        this.router.patch(path, ...middlewares, this.api(method))
        return this
    }

    delete(path, method, ...middlewares) {
        this.router.delete(path, ...middlewares, this.api(method))
        return this
    }

    getRouter() {
        return this.router
    }

}


module.exports = BaseRoute