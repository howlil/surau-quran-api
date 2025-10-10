const financeService = require('../service/finance.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const FileUtils = require('../../lib/utils/file.utils');

class FinanceController {
    create = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);

        // Handle evidence file upload (PDF only)
        if (req.file && req.file.fieldname === 'evidence') {
            data.evidence = req.file.filename;
        }

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const result = await financeService.create(data);
        const transformedResult = FileUtils.transformFinanceFiles(result, baseUrl);

        const responseData = {
            id: transformedResult.id,
            tanggal: transformedResult.tanggal,
            deskripsi: transformedResult.deskripsi,
            type: transformedResult.type,
            category: transformedResult.category,
            total: Number(transformedResult.total),
            evidence: transformedResult.evidence
        };
        return Http.Response.created(res, responseData, 'Data keuangan berhasil dibuat');
    });

    getAll = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['startDate', 'endDate', 'type', 'page', 'limit']);
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

        const result = await financeService.getAll(filters);

        // Transform dataTable items
        const transformedDataTable = FileUtils.transformFinanceListFiles(result.dataTable, baseUrl);

        const responseData = {
            income: result.income,
            expense: result.expense,
            revenue: result.revenue,
            dataTable: transformedDataTable.map(item => ({
                id: item.id,
                tanggal: item.tanggal,
                deskripsi: item.deskripsi,
                type: item.type,
                category: item.category,
                metodePembayaran: item.metodePembayaran,
                total: item.total,
                evidence: item.evidence
            }))
        };

        return Http.Response.success(res, responseData, 'Data keuangan berhasil diambil');
    });



    update = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);

        // Handle evidence file upload (PDF only)
        if (req.file && req.file.fieldname === 'evidence') {
            data.evidence = req.file.filename;
        } else {
            // Remove evidence from data if no file uploaded
            delete data.evidence;
        }

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const result = await financeService.update(id, data);
        const transformedResult = FileUtils.transformFinanceFiles(result, baseUrl);

        const responseData = {
            id: transformedResult.id,
            tanggal: transformedResult.tanggal,
            deskripsi: transformedResult.deskripsi,
            type: transformedResult.type,
            category: transformedResult.category,
            total: Number(transformedResult.total),
            evidence: transformedResult.evidence
        };
        return Http.Response.success(res, responseData, 'Data keuangan berhasil diperbarui');
    });

    delete = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        await financeService.delete(id);
        return Http.Response.success(res, null, 'Data keuangan berhasil dihapus');
    });
}

module.exports = new FinanceController(); 