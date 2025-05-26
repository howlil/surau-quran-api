const payrollService = require('../service/payroll.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const PayrollCronService = require('../service/payroll-cron.service');
const {prisma} = require('../../lib/config/prisma.config');
const { NotFoundError } = require('../../lib/http/errors.http');
const { logger } = require('../../lib/config/logger.config');

class PayrollController {
  createPayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.createPayroll(data);
    return Http.Response.created(res, result, 'Payroll berhasil dibuat');
  });

  updatePayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.updatePayroll(id, data);
    return Http.Response.success(res, result, 'Payroll berhasil diperbarui');
  });


  getAllPayrollsForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'bulan', 'tahun', 'guruId'
    ]);
    const result = await payrollService.getAllPayrollsForAdmin(filters);
    return Http.Response.success(res, result, 'Data payroll berhasil diambil');
  });

  getPayrollDetailForEdit = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await payrollService.getPayrollDetailForEdit(id);
    return Http.Response.success(res, result, 'Detail payroll berhasil diambil');
  });

  updatePayrollDetail = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.updatePayrollDetail(id, data);
    return Http.Response.success(res, result, 'Detail payroll berhasil diperbarui');
  });

  getPayrollForGuru = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user;

    if (!userId) {
      throw new NotFoundError('User tidak ditemukan');
    }

    logger.info(`Fetching payroll for guru with userId: ${userId.id}`);

    const guru = await prisma.guru.findUnique({
      where: { userId : userId.id },
    });

    if (!guru) {
      throw new NotFoundError('Profil guru tidak ditemukan');
    }

    const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'bulan', 'tahun']);
    const result = await payrollService.getPayrollForGuru(guru.id, filters);
    return Http.Response.success(res, result, 'Data payroll guru berhasil diambil');
  });

  generateMonthlyPayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.generateMonthlyPayroll(data);
    return Http.Response.success(res, result, 'Payroll bulanan berhasil digenerate');
  });

  generateManualPayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const { bulan, tahun } = HttpRequest.getBodyParams(req);
    const result = await PayrollCronService.runManualPayrollGeneration(bulan, tahun);
    return Http.Response.success(res, result, 'Payroll manual berhasil digenerate');
  });

  getPayrollSummary = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, ['periode', 'tahun']);
    const result = await payrollService.getPayrollSummary(filters);
    return Http.Response.success(res, result, 'Summary payroll berhasil diambil');
  });
}

module.exports = new PayrollController()