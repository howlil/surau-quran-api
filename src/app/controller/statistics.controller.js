const statisticsService = require('../service/statistics.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class StatisticsController {
    // Get student counts with date filtering
    getStudentCounts = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['startDate', 'endDate']);
        const result = await statisticsService.getStudentCounts(filters);
        return Http.Response.success(res, result, 'Statistik siswa berhasil diambil');
    });

    // Get financial statistics for graphs with date and grouping options
    getFinancialStatistics = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['startDate', 'endDate', 'groupBy']);
        const result = await statisticsService.getFinancialStatistics(filters);
        return Http.Response.success(res, result, 'Statistik keuangan berhasil diambil');
    });

    // Get student distribution across classes
    getStudentDistribution = ErrorHandler.asyncHandler(async (req, res) => {
        const result = await statisticsService.getStudentDistribution();
        return Http.Response.success(res, result, 'Distribusi siswa berhasil diambil');
    });

    // Get today's schedule with student counts
    getTodaySchedule = ErrorHandler.asyncHandler(async (req, res) => {
        const result = await statisticsService.getTodaySchedule();
        
        // Validasi hari Minggu - tidak ada jadwal
        if (result.hari === 'MINGGU') {
            return Http.Response.success(res, {
                tanggal: result.tanggal,
                hari: result.hari,
                message: 'Tidak ada jadwal kelas pada hari Minggu',
                jumlahSiswa: 0,
                siswaHadir: 0,
                schedules: []
            }, 'Tidak ada jadwal kelas pada hari Minggu');
        }
        
        return Http.Response.success(res, result, 'Jadwal hari ini berhasil diambil');
    });
}

module.exports = new StatisticsController(); 