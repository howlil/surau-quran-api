
class BaseRepository {
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }

    async create(options = {}) {
        try {
            return await this.prisma.create(options);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async update(options = {}) {
        try {
            return await this.prisma.update(options);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async delete(options = {}) {
        try {
            return await this.prisma.delete(options);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async findMany(options = {}) {
        try {
            return await this.prisma.findMany(options);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async findUnique(options = {}) {
        try {
            return await this.prisma.findUnique(options);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async findFirst(options = {}) {
        try {
            return await this.prisma.findFirst(options);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async getAll(options = {}) {
        const {
            page: pageParam = 1,
            limit: limitParam = 10,
            where = {},
            orderBy = {},
            select = {},
            include = {}
        } = options;

        const page = Number(pageParam);
        const limit = Number(limitParam);
        const skip = (page - 1) * limit;

        const excludedFields = ['createdAt', 'updatedAt'];
        const filteredSelect = Object.fromEntries(
            Object.entries(select).filter(([key]) => !excludedFields.includes(key))
        )

        try {
            const [total, data] = await Promise.all([
                this.prisma.count({ where }),
                this.prisma.findMany({
                    skip,
                    take: limit,
                    where,
                    orderBy: Object.keys(orderBy).length ? orderBy : undefined,
                    select: Object.keys(filteredSelect).length ? filteredSelect : undefined,
                    include: Object.keys(include).length ? include : undefined
                })
            ])

            return {
                data,
                meta: {
                    total,
                    limit,
                    page,
                    totalPages: Math.ceil(total / limit),
                }
            };

        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

}

module.exports = BaseRepository;