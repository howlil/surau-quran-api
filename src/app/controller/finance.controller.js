const financeService = require('../service/finance.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const FileUtils = require('../../lib/utils/file.utils');

class FinanceController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();

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
            return ResponseFactory.created(responseData).send(res);
        } catch (error) {
            next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['startDate', 'endDate', 'type', 'page', 'limit']);
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

            return ResponseFactory.get(responseData).send(res);
        } catch (error) {
      next(error)
        }
    };



    update = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();

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
            return ResponseFactory.updated(responseData).send(res);
        } catch (error) {
            next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await financeService.delete(id);
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };
}

module.exports = new FinanceController(); 