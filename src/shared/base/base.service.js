class BaseService {
    constructor(repository, logger) {
        this.repository = repository;
        this.logger = logger;
    }

    async getAll(options = {}) {
        try {

            const {
                page = 1,
                limit = 10,
                where = {},
                orderBy = {},
                select = {},
                include = {}
            } = options;


            const result = await this.repository.getAll({
                page,
                limit,
                where,
                orderBy,
                select,
                include
            });

            return result

        } catch (error) {
            this.logger.error(error)
            throw error
        }
    }

    async findMany(options = {}) {
        try {
            const { where = {}, orderBy = {}, select = {}, include = {} } = options;

            const result = await this.repository.findMany({
                where,
                orderBy,
                select: Object.keys(select).length ? select : undefined,
                include: Object.keys(include).length ? include : undefined
            });

            return result;
        } catch (error) {
            this.logger.error('Error in findMany:', error);
            throw error;
        }
    }

    async findUnique(options = {}) {
        try {


            const { where = {}, select = {}, include = {} } = options;

            const result = await this.repository.findUnique({
                where,
                select: Object.keys(select).length ? select : undefined,
                include: Object.keys(include).length ? include : undefined
            });

            if (!result) {
                throw new Error('Record not found');
            }

            return result;
        } catch (error) {
            this.logger.error('Error in getById:', error);
            throw error;
        }
    }

    async findOne(options = {}) {
        try {
            const { where = {}, select = {}, include = {} } = options;

            const result = await this.repository.findFirst({
                where,
                select: Object.keys(select).length ? select : undefined,
                include: Object.keys(include).length ? include : undefined
            });

            return result;
        } catch (error) {
            this.logger.error('Error in findOne:', error);
            throw error;
        }
    }

    async create(options = {}) {
        try {

            const { data, select = {}, include = {} } = options

            const result = await this.repository.create({
                data,
                select: Object.keys(select).length ? select : undefined,
                include: Object.keys(include).length ? include : undefined
            })

            return result
        } catch (error) {
            this.logger.error(error)
            throw error
        }
    }

    async update(options = {}) {
        try {
            const { where, data, select = {}, include = {} } = options
            const result = await this.repository.update({
                where,
                data,
                select: Object.keys(select).length ? select : undefined,
                include: Object.keys(include).length ? include : undefined
            })
            return result
        } catch (error) {
            this.logger.error(error)
            throw error
        }
    }

    async delete(id) {
        try {
            const result = await this.repository.delete({
                where: { id }
            })
            return result
        } catch (error) {
            this.logger.error(error)
            throw error
        }
    }
}

module.exports = BaseService;