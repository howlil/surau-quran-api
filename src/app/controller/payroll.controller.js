const payrollService = require('../service/payroll.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

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

  deletePayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await payrollService.deletePayroll(id);
    return Http.Response.success(res, { id }, 'Payroll berhasil dihapus');
  });

  getAllPayrolls = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'periode', 'status', 'guruId'
    ]);
    const result = await payrollService.getAllPayrolls(filters);
    return Http.Response.success(res, result);
  });

  getPayrollById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await payrollService.getPayrollById(id);
    return Http.Response.success(res, result);
  });

  processPayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await payrollService.processPayroll(id);
    return Http.Response.success(res, result, 'Payroll berhasil diproses');
  });

  generateMonthlyPayroll = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.generateMonthlyPayroll(data);
    return Http.Response.success(res, result, 'Payroll bulanan berhasil digenerate');
  });

  getPayrollSummary = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, ['periode', 'tahun']);
    const result = await payrollService.getPayrollSummary(filters);
    return Http.Response.success(res, result);
  });

  disburseBatch = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await payrollService.disburseBatch(data);
    return Http.Response.success(res, result, 'Batch disbursement berhasil diproses');
  });
}

module.exports = new PayrollController();