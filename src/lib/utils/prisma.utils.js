const { prisma } = require('../../config/prisma.config');
const { logger } = require('../../config/logger.config');

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
      page = 1,
      limit = 10,
      where = {},
      orderBy = {},
      select = {},
      include = {}
    } = options;

    const skip = (page - 1) * limit;

    const [total, data] = await prisma.$transaction([
      model.count({ where }),
      model.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        select: Object.keys(select).length ? select : undefined,
        include: Object.keys(include).length ? include : undefined
      })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + data.length < total,
        hasPreviousPage: page > 1
      }
    };
  }

  static buildWhereClause(filters = {}) {
    const where = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle different data types appropriately
        if (typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value))) {
          if (value.includes('.')) {
            where[key] = parseFloat(value);
          } else {
            where[key] = parseInt(value, 10);
          }
        } else if (typeof value === 'string') {
          // String search with case insensitivity
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