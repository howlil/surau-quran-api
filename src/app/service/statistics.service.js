const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');

class StatisticsService {
    async getStudentCounts(filters = {}) {
        try {
            const { startDate, endDate } = filters;

            // Build date filter based on user requirement
            let dateWhere = {};
            if (startDate) {
                if (endDate) {
                    // If both startDate and endDate provided, search in date range
                    // Convert DD-MM-YYYY to DD-MM-YYYY for direct comparison
                    dateWhere = {
                        tanggal: {
                            gte: moment(startDate, DATE_FORMATS.DEFAULT).format(DATE_FORMATS.DEFAULT),
                            lte: moment(endDate, DATE_FORMATS.DEFAULT).format(DATE_FORMATS.DEFAULT)
                        }
                    };
                } else {
                    // If only startDate provided, search exactly on that date
                    dateWhere = {
                        tanggal: moment(startDate, DATE_FORMATS.DEFAULT).format(DATE_FORMATS.DEFAULT)
                    };
                }
            }

            // Get total students count
            const totalStudents = await prisma.siswa.count({
                where: {
                    isRegistered: true
                }
            });

            // Get present students count for the date filter
            const presentStudents = await prisma.absensiSiswa.count({
                where: {
                    statusKehadiran: 'HADIR',
                    ...dateWhere
                }
            });

            // Get absent students count for the date filter
            const absentStudents = await prisma.absensiSiswa.count({
                where: {
                    statusKehadiran: 'TIDAK_HADIR',
                    ...dateWhere
                }
            });

            // Get total programs count
            const totalPrograms = await prisma.program.count();

            // Build date filter for registration date
            let regDateWhere = {};
            if (startDate) {
                if (endDate) {
                    // Convert DD-MM-YYYY to DD-MM-YYYY for pendaftaran date comparison
                    regDateWhere = {
                        tanggalDaftar: {
                            gte: moment(startDate, DATE_FORMATS.DEFAULT).format(DATE_FORMATS.DEFAULT),
                            lte: moment(endDate, DATE_FORMATS.DEFAULT).format(DATE_FORMATS.DEFAULT)
                        }
                    };
                } else {
                    regDateWhere = {
                        tanggalDaftar: moment(startDate, DATE_FORMATS.DEFAULT).format(DATE_FORMATS.DEFAULT)
                    };
                }
            }

            // Get new students count for the date filter (based on registration date)
            const newStudents = await prisma.pendaftaran.count({
                where: regDateWhere
            });

            return {
                totalStudents,
                presentStudents,
                absentStudents,
                totalPrograms,
                newStudents
            };
        } catch (error) {
            logger.error('Error getting student counts:', error);
            throw error;
        }
    }

    async getFinancialStatistics(filters = {}) {
        try {
            const { startDate, endDate, groupBy = 'month' } = filters;

            // Build date filter based on user requirement
            let dateFilter = {};
            if (startDate) {
                if (endDate) {
                    // If both startDate and endDate provided, search in date range
                    // Convert DD-MM-YYYY to YYYY-MM-DD for database comparison
                    const parsedStartDate = moment(startDate, DATE_FORMATS.DEFAULT).format('YYYY-MM-DD');
                    const parsedEndDate = moment(endDate, DATE_FORMATS.DEFAULT).format('YYYY-MM-DD');

                    dateFilter = {
                        tanggalPembayaran: {
                            gte: parsedStartDate,
                            lte: parsedEndDate
                        }
                    };
                } else {
                    // If only startDate provided, search exactly on that date
                    const parsedStartDate = moment(startDate, DATE_FORMATS.DEFAULT).format('YYYY-MM-DD');
                    dateFilter = {
                        tanggalPembayaran: parsedStartDate
                    };
                }
            } else {
                // If no date filter provided, use default range for better visualization
                const parsedStartDate = this.getDefaultStartDate(groupBy);
                const parsedEndDate = moment().format('YYYY-MM-DD');

                dateFilter = {
                    tanggalPembayaran: {
                        gte: parsedStartDate,
                        lte: parsedEndDate
                    }
                };
            }

            // Get income data (from pendaftaran and SPP payments)
            const pendaftaranPayments = await prisma.pembayaran.findMany({
                where: {
                    tipePembayaran: 'PENDAFTARAN',
                    statusPembayaran: 'PAID',
                    ...dateFilter
                },
                select: {
                    jumlahTagihan: true,
                    tanggalPembayaran: true
                }
            });

            const sppPayments = await prisma.pembayaran.findMany({
                where: {
                    tipePembayaran: 'SPP',
                    statusPembayaran: 'PAID',
                    ...dateFilter
                },
                select: {
                    jumlahTagihan: true,
                    tanggalPembayaran: true
                }
            });

            // Build payroll date filter for month/year based system
            let payrollFilter = {};
            if (startDate) {
                if (endDate) {
                    // Date range filtering for payroll
                    const startYear = moment(startDate, DATE_FORMATS.DEFAULT).year();
                    const startMonth = moment(startDate, DATE_FORMATS.DEFAULT).month() + 1;
                    const endYear = moment(endDate, DATE_FORMATS.DEFAULT).year();
                    const endMonth = moment(endDate, DATE_FORMATS.DEFAULT).month() + 1;

                    payrollFilter = {
                        OR: [
                            {
                                // Same year
                                AND: [
                                    { tahun: startYear },
                                    { tahun: endYear },
                                    {
                                        bulan: {
                                            gte: startMonth.toString().padStart(2, '0'),
                                            lte: endMonth.toString().padStart(2, '0')
                                        }
                                    }
                                ]
                            },
                            {
                                // Different years
                                OR: [
                                    {
                                        AND: [
                                            { tahun: startYear },
                                            { bulan: { gte: startMonth.toString().padStart(2, '0') } }
                                        ]
                                    },
                                    {
                                        AND: [
                                            { tahun: endYear },
                                            { bulan: { lte: endMonth.toString().padStart(2, '0') } }
                                        ]
                                    },
                                    {
                                        AND: [
                                            { tahun: { gt: startYear } },
                                            { tahun: { lt: endYear } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    };
                } else {
                    // Single date filtering for payroll
                    const year = moment(startDate, DATE_FORMATS.DEFAULT).year();
                    const month = moment(startDate, DATE_FORMATS.DEFAULT).month() + 1;

                    payrollFilter = {
                        tahun: year,
                        bulan: month.toString().padStart(2, '0')
                    };
                }
            } else {
                // Default range for payroll
                const startYear = moment().subtract(6, 'months').year();
                const startMonth = moment().subtract(6, 'months').month() + 1;
                const endYear = moment().year();
                const endMonth = moment().month() + 1;

                payrollFilter = {
                    OR: [
                        {
                            // Same year
                            AND: [
                                { tahun: startYear },
                                { tahun: endYear },
                                {
                                    bulan: {
                                        gte: startMonth.toString().padStart(2, '0'),
                                        lte: endMonth.toString().padStart(2, '0')
                                    }
                                }
                            ]
                        },
                        {
                            // Different years
                            OR: [
                                {
                                    AND: [
                                        { tahun: startYear },
                                        { bulan: { gte: startMonth.toString().padStart(2, '0') } }
                                    ]
                                },
                                {
                                    AND: [
                                        { tahun: endYear },
                                        { bulan: { lte: endMonth.toString().padStart(2, '0') } }
                                    ]
                                },
                                {
                                    AND: [
                                        { tahun: { gt: startYear } },
                                        { tahun: { lt: endYear } }
                                    ]
                                }
                            ]
                        }
                    ]
                };
            }

            // Get payroll data
            const payrollData = await prisma.payroll.findMany({
                where: {
                    status: 'SELESAI',
                    ...payrollFilter
                },
                select: {
                    totalGaji: true,
                    bulan: true,
                    tahun: true
                }
            });

            // Group and format the data by the specified grouping (month or year)
            const incomeData = this.groupFinancialDataByPeriod([...pendaftaranPayments, ...sppPayments], 'tanggalPembayaran', groupBy);
            const payrollData2 = this.groupPayrollDataByPeriod(payrollData, groupBy);

            return {
                income: {
                    data: incomeData,
                    total: Object.values(incomeData).reduce((sum, item) => sum + Number(item.value), 0)
                },
                payroll: {
                    data: payrollData2,
                    total: Object.values(payrollData2).reduce((sum, item) => sum + Number(item.value), 0)
                },
                profit: {
                    data: Object.keys(incomeData).map(period => ({
                        period,
                        value: (Number(incomeData[period]?.value) || 0) - (Number(payrollData2[period]?.value) || 0)
                    })),
                    total: Object.values(incomeData).reduce((sum, item) => sum + Number(item.value), 0) -
                        Object.values(payrollData2).reduce((sum, item) => sum + Number(item.value), 0)
                }
            };
        } catch (error) {
            logger.error('Error getting financial statistics:', error);
            throw error;
        }
    }

    async getStudentDistribution() {
        try {
            // Get kelas distribution
            const kelasDistribution = await prisma.kelas.findMany({
                select: {
                    id: true,
                    namaKelas: true,
                    kelasProgram: {
                        select: {
                            _count: {
                                select: {
                                    programSiswa: true
                                }
                            }
                        }
                    }
                }
            });

            // Transform kelas data for visualization
            const kelasCounts = kelasDistribution.map(kelas => {
                const studentCount = kelas.kelasProgram.reduce(
                    (sum, kelasProgram) => sum + kelasProgram._count.programSiswa, 0
                );

                return {
                    id: kelas.id,
                    name: kelas.namaKelas,
                    studentCount
                };
            });

            // Get program distribution
            const programDistribution = await prisma.program.findMany({
                select: {
                    id: true,
                    namaProgram: true,
                    programSiswa: {
                        where: {
                            status: 'AKTIF'
                        },
                        select: {
                            id: true
                        }
                    }
                }
            });

            // Transform program data for visualization
            const programCounts = programDistribution.map(program => ({
                id: program.id,
                name: program.namaProgram,
                studentCount: program.programSiswa.length
            }));

            // Get detailed class distribution (day and time)
            const detailedClassDistribution = await prisma.kelasProgram.findMany({
                select: {
                    id: true,
                    hari: true,
                    kelas: {
                        select: {
                            namaKelas: true
                        }
                    },
                    program: {
                        select: {
                            namaProgram: true
                        }
                    },
                    jamMengajar: {
                        select: {
                            jamMulai: true,
                            jamSelesai: true
                        }
                    },
                    _count: {
                        select: {
                            programSiswa: true
                        }
                    }
                },
                orderBy: [
                    { hari: 'asc' },
                    { jamMengajar: { jamMulai: 'asc' } }
                ]
            });

            // Transform detailed class data
            const detailedClassCounts = detailedClassDistribution.map(item => ({
                id: item.id,
                day: item.hari,
                class: item.kelas?.namaKelas || 'Tidak ada kelas',
                program: item.program.namaProgram,
                time: `${item.jamMengajar.jamMulai} - ${item.jamMengajar.jamSelesai}`,
                studentCount: item._count.programSiswa
            }));

            // Calculate most popular based on actual counts
            const mostPopularClass = kelasCounts.length > 0
                ? kelasCounts.reduce((prev, current) =>
                    (prev.studentCount > current.studentCount) ? prev : current)
                : { name: 'Tidak ada kelas', studentCount: 0 };

            const mostPopularProgram = programCounts.length > 0
                ? programCounts.reduce((prev, current) =>
                    (prev.studentCount > current.studentCount) ? prev : current)
                : { name: 'Tidak ada program', studentCount: 0 };

            return {
                byClass: kelasCounts,
                byProgram: programCounts,
                bySchedule: detailedClassCounts,
                summary: {
                    totalClasses: kelasCounts.length,
                    totalPrograms: programCounts.length,
                    mostPopularClass,
                    mostPopularProgram
                }
            };
        } catch (error) {
            logger.error('Error getting student distribution:', error);
            throw error;
        }
    }

    getDefaultStartDate(groupBy) {
        if (groupBy === 'year') {
            return moment().subtract(1, 'year').format('YYYY-MM-DD');
        } else {
            // Default to 6 months for monthly grouping
            return moment().subtract(6, 'months').format('YYYY-MM-DD');
        }
    }

    groupFinancialDataByPeriod(data, dateField, groupBy) {
        const result = {};

        data.forEach(item => {
            const date = new Date(item[dateField]);
            let period;

            if (groupBy === 'year') {
                period = date.getFullYear().toString();
            } else {
                // Default to month
                period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }

            if (!result[period]) {
                result[period] = {
                    period,
                    value: 0,
                    count: 0
                };
            }

            result[period].value += Number(item.jumlahTagihan || item.totalGaji || 0);
            result[period].count += 1;
        });

        return result;
    }

    groupPayrollDataByPeriod(data, groupBy) {
        const result = {};

        data.forEach(item => {
            const period = groupBy === 'month'
                ? `${item.tahun}-${item.bulan.padStart(2, '0')}`
                : item.tahun.toString();

            if (!result[period]) {
                result[period] = { period, value: 0 };
            }
            result[period].value += Number(item.totalGaji);
        });

        return result;
    }

    async getTodaySchedule() {
        try {
            // Get today's date
            const today = moment().format(DATE_FORMATS.DEFAULT);

            // Get current day name in Indonesian format
            const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
            const todayDayName = dayNames[moment().day()];

            // Get total registered students count
            const jumlahSiswa = await prisma.siswa.count({
                where: {
                    isRegistered: true
                }
            });

            // Get students present today
            const siswaHadir = await prisma.absensiSiswa.count({
                where: {
                    statusKehadiran: 'HADIR',
                    tanggal: today
                }
            });

            // Get all kelasProgram for today
            const kelasPrograms = await prisma.kelasProgram.findMany({
                where: {
                    hari: todayDayName
                },
                include: {
                    kelas: {
                        select: {
                            namaKelas: true
                        }
                    },
                    program: {
                        select: {
                            namaProgram: true
                        }
                    },
                    jamMengajar: {
                        select: {
                            id: true,
                            jamMulai: true,
                            jamSelesai: true
                        }
                    }
                },
                orderBy: {
                    jamMengajar: {
                        jamMulai: 'asc'
                    }
                }
            });

            // Group by jamMengajar
            const schedulesMap = new Map();

            kelasPrograms.forEach(kp => {
                const jamMengajarId = kp.jamMengajar.id;

                if (!schedulesMap.has(jamMengajarId)) {
                    schedulesMap.set(jamMengajarId, {
                        jamMengajarId: jamMengajarId,
                        jamMulai: kp.jamMengajar.jamMulai,
                        jamSelesai: kp.jamMengajar.jamSelesai,
                        kelasProgram: []
                    });
                }

                schedulesMap.get(jamMengajarId).kelasProgram.push({
                    kelasProgramId: kp.id,
                    namaKelas: kp.kelas?.namaKelas || 'Tidak Ada Kelas',
                    namaProgram: kp.program.namaProgram
                });
            });

            // Convert map to array
            const schedules = Array.from(schedulesMap.values());

            const result = {
                tanggal: today,
                jumlahSiswa,
                siswaHadir,
                schedules
            };

            logger.info(`Retrieved today's schedule for ${today} (${todayDayName}) with ${schedules.length} time slots`);
            return result;

        } catch (error) {
            logger.error('Error getting today schedule:', error);
            throw error;
        }
    }
}

module.exports = new StatisticsService(); 