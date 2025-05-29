const payrollService = require('../service/payroll.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const PayrollCronService = require('../service/payroll-cron.service');
const { prisma } = require('../../lib/config/prisma.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const { logger } = require('../../lib/config/logger.config');

class PayrollController {


  updatePayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.updatePayroll(id, data);
    return Http.Response.success(res, result, 'Payroll berhasil diperbarui');
  });


  getAllPayrollsForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'bulan',
    ]);
    const result = await payrollService.getAllPayrollsForAdmin(filters);
    return Http.Response.success(res, result, 'Data payroll berhasil diambil');
  });


  getAllPayrollsForGuru = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'bulan'
    ]);

    // Get guru ID from authenticated user
    const guru = await prisma.guru.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });

    if (!guru) {
      throw new BadRequestError('Guru tidak ditemukan');
    }

    const result = await payrollService.getAllPayrollsForGuru(guru.id, filters);
    return Http.Response.success(res, result, 'Data payroll berhasil diambil');
  });
}

module.exports = new PayrollController()