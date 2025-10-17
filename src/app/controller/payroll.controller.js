const payrollService = require('../service/payroll.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { xenditConfig } = require('../../lib/config/xendit.config');

class PayrollController {


  updatePayroll = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      const result = await payrollService.updatePayroll(id, data);
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      next(error)
    }
  };


  getAllPayrollsForAdmin = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery([
        'page', 'limit', 'monthYear'
      ]);
      const result = await payrollService.getAllPayrollsForAdmin(filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
next(error)
    }
  };


  getAllPayrollsForGuru = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery([
        'page', 'limit', 'monthYear'
      ]);

      // Get guru ID from authenticated user
      const guru = await prisma.guru.findUnique({
        where: { userId: req.user.id },
        select: { id: true }
      });

      if (!guru) {
        throw ErrorFactory.badRequest('Guru tidak ditemukan');
      }

      const result = await payrollService.getAllPayrollsForGuru(guru.id, filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      next(error);
    }
  };

  batchPayrollDisbursement = async (req, res, next) => {
    try {
      const { payrollIds } = req.extract.getBody(['payrollIds']);
      const result = await payrollService.batchPayrollDisbursement(payrollIds);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  handleDisbursementCallback = async (req, res, next) => {
    try {
      const callbackToken = req.extract.getHeaders(['x-callback-token'])['x-callback-token'];
      const rawBody = req.body;

      const isValidToken = xenditConfig.validateCallbackToken(callbackToken);
      if (!isValidToken) {
        logger.warn('Invalid Xendit callback token received');
        throw ErrorFactory.unauthorized('Invalid callback token');
      }

      const result = await payrollService.handleDisbursementCallback(rawBody);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error('Error handling disbursement callback:', error);
next(error)
    }
  };
}

module.exports = new PayrollController()