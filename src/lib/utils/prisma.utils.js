const { prisma } = require('../config/prisma.config');
const { logger } = require('../config/logger.config');

class PrismaUtils {
  static async transaction(callback) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await callback(tx);
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'ReadCommitted'
      });
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  static async paginate(model, options = {}) {
    const {
      page: pageParam = 1,
      limit: limitParam = 10,
      where = {},
      orderBy = {},
      select = {},
      include = {}
    } = options;

    // Pastikan page dan limit adalah angka
    const page = Number(pageParam);
    const limit = Number(limitParam);

    // Exclude createdAt and updatedAt from select if they exist
    const excludedFields = ['createdAt', 'updatedAt'];
    const filteredSelect = Object.fromEntries(
      Object.entries(select).filter(([key]) => !excludedFields.includes(key))
    );
    const skip = (page - 1) * limit;

    try {
      const [total, data] = await prisma.$transaction([
        model.count({ where }),
        model.findMany({
          skip,
          take: limit,
          where,
          orderBy,
          select: Object.keys(filteredSelect).length ? filteredSelect : undefined,
          include: Object.keys(include).length ? include : undefined
        })
      ]);

      const filteredData = data.map(item => {
        if (item) {
          const { createdAt, updatedAt, ...rest } = item;
          return rest;
        }
        return item;
      });
      
      return {
        data: filteredData,
        meta: {
          total,
          limit,
          page,
          totalPages: Math.ceil(total / limit),

        }
      };
    } catch (error) {
      logger.error('Pagination error:', error);
      throw error;
    }
  }

  static buildWhereClause(filters = {}) {
    const where = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value))) {
          if (value.includes('.')) {
            where[key] = parseFloat(value);
          } else {
            where[key] = parseInt(value, 10);
          }
        } else if (typeof value === 'string') {
          where[key] = { contains: value, mode: 'insensitive' };
        } else {
          where[key] = value;
        }
      }
    });

    return where;
  }
}

module.exports = PrismaUtils;