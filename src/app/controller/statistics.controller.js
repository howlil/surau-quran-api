const statisticsService = require('../service/statistics.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');

class StatisticsController {
    // Get student counts with date filtering
    getStudentCounts = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['startDate', 'endDate']);
            const result = await statisticsService.getStudentCounts(filters);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
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
      next(error)
        }
    };

    // Get student distribution across classes
    getStudentDistribution = async (req, res, next) => {
        try {
            const result = await statisticsService.getStudentDistribution();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };

    // Get today's schedule with student counts
    getTodaySchedule = async (req, res, next) => {
        try {
            const result = await statisticsService.getTodaySchedule();
            
            // Validasi hari Minggu - tidak ada jadwal
            if (result.hari === 'MINGGU') {
                return ResponseFactory.get({
                    tanggal: result.tanggal,
                    hari: result.hari,
                    message: 'Tidak ada jadwal kelas pada hari Minggu',
                    jumlahSiswa: 0,
                    siswaHadir: 0,
                    schedules: []
                }).send(res);
            }
            
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };
}

module.exports = new StatisticsController(); 