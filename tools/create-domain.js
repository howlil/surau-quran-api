const fs = require('fs')
const path = require('path')

class DomainGenerator {
    constructor() {
        this.domainPath = path.join(__dirname, '../src/domain')
    }

    generateDomain(domainName) {
        try {
            const DomainName = this.capitalizeFirst(domainName)
            const domainNameLower = domainName.toLowerCase()
            const domainNameCamel = this.camelCase(domainName)

            const domainDir = path.join(this.domainPath, domainNameLower)
            if (!fs.existsSync(domainDir)) {
                fs.mkdirSync(domainDir, { recursive: true })
                console.log(`✅ Created directory: ${domainDir}`)
            }

            this.generateRepository(domainDir, DomainName, domainNameCamel)
            this.generateService(domainDir, DomainName, domainNameCamel)
            this.generateController(domainDir, DomainName, domainNameCamel)
            this.generateRoute(domainDir, DomainName, domainNameCamel)
            this.generateValidation(domainDir, DomainName, domainNameCamel)

            console.log(`🎉 Successfully generated domain: ${DomainName}`)
            console.log(`📁 Location: src/domain/${domainNameLower}/`)

        } catch (error) {
            console.error('❌ Error generating domain:', error.message)
        }
    }

    generateRepository(domainDir, DomainName, domainNameCamel) {
        const fileName = `${domainNameCamel}.repository.js`
        const filePath = path.join(domainDir, fileName)

        const content = `const BaseRepository = require("../../shared/base/base.repository")

class ${DomainName}Repository extends BaseRepository {
    constructor(prisma, logger) {
        super(prisma.${domainNameCamel}, logger)
    }
}

module.exports = ${DomainName}Repository`

        fs.writeFileSync(filePath, content)
        console.log(`✅ Generated: ${fileName}`)
    }

    generateService(domainDir, DomainName, domainNameCamel) {
        const fileName = `${domainNameCamel}.service.js`
        const filePath = path.join(domainDir, fileName)

        const content = `const BaseService = require("../../shared/base/base.service")

class ${DomainName}Service extends BaseService {
    constructor(${domainNameCamel}Repository, logger) {
        super(${domainNameCamel}Repository, logger)
        this.${domainNameCamel}Repository = ${domainNameCamel}Repository
    }
}

module.exports = ${DomainName}Service`

        fs.writeFileSync(filePath, content)
        console.log(`✅ Generated: ${fileName}`)
    }

    generateController(domainDir, DomainName, domainNameCamel) {
        const fileName = `${domainNameCamel}.controller.js`
        const filePath = path.join(domainDir, fileName)

        const content = `const BaseController = require("../../shared/base/base.controller")

class ${DomainName}Controller extends BaseController {
    constructor(${domainNameCamel}Service, logger) {
        super(${domainNameCamel}Service, logger)
        this.${domainNameCamel}Service = ${domainNameCamel}Service
        this.logger = logger
    }
}

module.exports = ${DomainName}Controller`

        fs.writeFileSync(filePath, content)
        console.log(`✅ Generated: ${fileName}`)
    }

    generateRoute(domainDir, DomainName, domainNameCamel) {
        const fileName = `${domainNameCamel}.route.js`
        const filePath = path.join(domainDir, fileName)

        const content = `const BaseRoute = require("../../shared/base/base.route")
const ${domainNameCamel}Controller = require("./${domainNameCamel}.controller")

class ${DomainName}Route extends BaseRoute {
    constructor() {
        super(${domainNameCamel}Controller)
    }

    static getInstance() {
        if (!${DomainName}Route.instance) {
            ${DomainName}Route.instance = new ${DomainName}Route()
        }
        return ${DomainName}Route.instance
    }

    createRoute() {
        this.get("/v1/${domainNameCamel}s", "findMany")
        this.get("/v1/${domainNameCamel}/:id", "findUnique")
        this.post("/v1/${domainNameCamel}", "create")
        this.patch("/v1/${domainNameCamel}/:id", "update")
        this.delete("/v1/${domainNameCamel}/:id", "delete")
    }
}

module.exports = ${DomainName}Route.getInstance().getRouter()`

        fs.writeFileSync(filePath, content)
        console.log(`✅ Generated: ${fileName}`)
    }

    generateValidation(domainDir, DomainName, domainNameCamel) {
        const fileName = `${domainNameCamel}.validation.js`
        const filePath = path.join(domainDir, fileName)

        const content = `const joi = require('joi')

class ${DomainName}Validation {
    static createSchema() {
        return joi.object({
            name: joi.string()
                .min(2)
                .max(100)
                .required()
                .messages({
                    'string.min': 'Nama minimal 2 karakter',
                    'string.max': 'Nama maksimal 100 karakter',
                    'any.required': 'Nama wajib diisi'
                })
        })
    }

    static updateSchema() {
        return joi.object({
            name: joi.string()
                .min(2)
                .max(100)
                .optional()
                .messages({
                    'string.min': 'Nama minimal 2 karakter',
                    'string.max': 'Nama maksimal 100 karakter'
                })
        })
    }
}

module.exports = ${DomainName}Validation`

        fs.writeFileSync(filePath, content)
        console.log(`✅ Generated: ${fileName}`)
    }



    capitalizeFirst(str) {
        if (str.includes("-")) {
            return str
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('')
        }
        return str.charAt(0).toUpperCase() + str.slice(1)
    }

    camelCase(str) {
        if (str.includes("-")) {
            return str
                .split('-')
                .map((word, index) => {
                    if (index === 0) {
                        return word.toLowerCase()
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                })
                .join('')
        }
        return str.charAt(0).toLowerCase() + str.slice(1)
    }
}

if (require.main === module) {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        console.log('Usage: node create-domain.js <domainName>')
        console.log('Example: node create-domain.js auth')
        console.log('Example: node create-domain.js user')
        process.exit(1)
    }

    const domainName = args[0]
    const generator = new DomainGenerator()
    generator.generateDomain(domainName)
}

module.exports = DomainGenerator