const awilix = require("awilix")
const prisma = require("./prisma.config")
const logger = require("./logger.config")

class AwilixConfig {
    constructor() {
        this.container = awilix.createContainer({ injectionMode: "CLASSIC" })
        this.registerCore();
        this.loadModules()

    }

    registerCore() {
        this.container.register({
            prisma: awilix.asValue(prisma),
            logger: awilix.asValue(logger)
        })
    }

    loadModules() {

        this.container.loadModules([
            'src/domain/*/*repository.js'
        ], {
            formatName: 'camelCase',
            resolverOptions: {
                lifetime: awilix.Lifetime.SINGLETON
            }
        })

        this.container.loadModules([
            'src/domain/*/*service.js'
        ], {
            formatName: 'camelCase',
            resolverOptions: {
                lifetime: awilix.Lifetime.SINGLETON
            }
        })
        console.log('🔧 After loading services:', Object.keys(this.container.registrations))

        this.container.loadModules([
            'src/domain/*/*controller.js'
        ], {
            formatName: 'camelCase',
            resolverOptions: {
                lifetime: awilix.Lifetime.SCOPED
            }
        })

    }

    get scope() {
        return this.container.createScope()
    }

    get instance() {
        return this.container
    }
}

module.exports = new AwilixConfig()