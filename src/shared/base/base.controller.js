const ResponseFactory = require("../../shared/factories/response.factory");

class BaseController {
    constructor(service, logger) {
        this.service = service;
        this.logger = logger;
    }

    async getAll(req, res, next) {
        try {
            const { page, limit, filter } = req.extract.getQuery(["page", "limit", "filter"])

            const result = await this.service.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                filter: filter || {}
            })

            return ResponseFactory.getAll(result.data, result.meta).send(res)

        } catch (error) {
            this.logger.error(error)
            next(error)
        }
    }

    async findMany(req, res, next) {
        try {

            const { filter } = req.extract.getQuery(["filter"])

            const result = await this.service.findMany({
                filter: filter
            })

            return ResponseFactory.get(result).send(res)

        } catch (error) {
            next(error)
        }
    }


    async create(req, res, next) {
        try {
            const data = req.extract.getBody()
            await this.service.create({ data })

            return ResponseFactory.created(data).send(res)

        } catch (error) {

            next(error)
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.extract.getParams(["id"])
            const data = req.extract.getBody()

            await this.service.update({
                where: { id },
                data
            })

            return ResponseFactory.updated(data).send(res)
        } catch (error) {
            next(error)
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.extract.getParams(["id"])
            await this.service.delete(id)
            return ResponseFactory.deleted().send(res)
        } catch (error) {
            next(error)
        }
    }


}

module.exports = BaseController;