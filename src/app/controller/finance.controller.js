const financeService = require('../service/finance.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class FinanceController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();

            if (req.file && req.file.fieldname === 'evidence') {
                data.evidence = req.file.filename;
            }

            const result = await financeService.create({ data });
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['startDate', 'endDate', 'type', 'page', 'limit']);
            const result = await financeService.getAll({ data: filters });

            const responseData = {
                income: result.income,
                expense: result.expense,
                revenue: result.revenue,
                dataTable: result.dataTable
            };

            return ResponseFactory.get(responseData).send(res);
        } catch (error) {
      logger.error(error);
      next(error)
        }
    };



    update = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();

            if (req.file && req.file.fieldname === 'evidence') {
                data.evidence = req.file.filename;
            } else {
                delete data.evidence;
            }

            const result = await financeService.update({ data, where: { id } });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await financeService.delete({ where: { id } });
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };
}

module.exports = new FinanceController(); 