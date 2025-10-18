const prisma  = require('../config/prisma.config');
const logger = require('../../lib/config/logger.config');

class PrismaUtils {
  static async paginate(model, options = {}) {
    const {
      page: pageParam = 1,
      limit: limitParam = 10,
      where = {},
      orderBy = null,
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
      const [total, data] = await prisma.$transaction([
        model.count({ where }),
        model.findMany({
          skip,
          take: limit,
          where,
          orderBy: orderBy || undefined,
          select: Object.keys(filteredSelect).length ? filteredSelect : undefined,
          include: Object.keys(include).length ? include : undefined
        })
      ]);

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
      logger.error(error);
      throw error;
    }
  }

}

module.exports = PrismaUtils;