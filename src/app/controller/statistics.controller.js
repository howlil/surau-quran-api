const statisticsService = require('../service/statistics.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class StatisticsController {
    // Get student counts with date filtering
    getStudentCounts = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['startDate', 'endDate']);
            const result = await statisticsService.getStudentCounts(filters);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      logger.error(error);
      next(error)
        }
    };

    // Get financial statistics for graphs with date and grouping options
    getFinancialStatistics = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['startDate', 'endDate', 'groupBy']);
            const result = await statisticsService.getFinancialStatistics(filters);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      logger.error(error);
      next(error)
        }
    };

    // Get student distribution across classes
    getStudentDistribution = async (req, res, next) => {
        try {
            const result = await statisticsService.getStudentDistribution();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      logger.error(error);
      next(error)
        }
    };

    // Get today's schedule with student counts
    getTodaySchedule = async (req, res, next) => {
        try {
            const result = await statisticsService.getTodaySchedule();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      logger.error(error);
      next(error)
        }
    };
}

module.exports = new StatisticsController(); 