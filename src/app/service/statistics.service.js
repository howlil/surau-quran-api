const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');

class StatisticsService {
    async getStudentCounts(filters = {}) {
        try {
            const { startDate, endDate } = filters;

            // Parse dates if provided
            const parsedStartDate = startDate ? startDate : null;
            const parsedEndDate = endDate ? endDate : null;

            // Get total students count
            const totalStudents = await prisma.siswa.count({
                where: {
                    isRegistered: true
                }
            });

            // Get present students count for the date range
            const presentStudents = await prisma.absensiSiswa.count({
                where: {
                    statusKehadiran: 'HADIR',
                    ...(parsedStartDate && parsedEndDate && {
                        tanggal: {
                            gte: parsedStartDate,
                            lte: parsedEndDate
                        }
                    })
                }
            });

            // Get absent students count for the date range
            const absentStudents = await prisma.absensiSiswa.count({
                where: {
                    statusKehadiran: 'TIDAK_HADIR',
                    ...(parsedStartDate && parsedEndDate && {
                        tanggal: {
                            gte: parsedStartDate,
                            lte: parsedEndDate
                        }
                    })
                }
            });

            // Get total programs count
            const totalPrograms = await prisma.program.count();

            // Get new students count for the date range (based on registration date)
            const newStudents = await prisma.pendaftaran.count({
                where: {
                    ...(parsedStartDate && parsedEndDate && {
                        tanggalDaftar: {
                            gte: parsedStartDate,
                            lte: parsedEndDate
                        }
                    })
                }
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

            // Parse dates if provided
            const parsedStartDate = startDate || this.getDefaultStartDate(groupBy);
            const parsedEndDate = endDate || new Date().toISOString().split('T')[0];

            // Get income data (from pendaftaran and SPP payments)
            const pendaftaranPayments = await prisma.pembayaran.findMany({
                where: {
                    tipePembayaran: 'PENDAFTARAN',
                    statusPembayaran: 'PAID',
                    tanggalPembayaran: {
                        gte: parsedStartDate,
                        lte: parsedEndDate
                    }
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
                    tanggalPembayaran: {
                        gte: parsedStartDate,
                        lte: parsedEndDate
                    }
                },
                select: {
                    jumlahTagihan: true,
                    tanggalPembayaran: true
                }
            });

            // Get payroll data
            const startYear = new Date(parsedStartDate).getFullYear();
            const startMonth = new Date(parsedStartDate).getMonth() + 1;
            const endYear = new Date(parsedEndDate).getFullYear();
            const endMonth = new Date(parsedEndDate).getMonth() + 1;

            const payrollData = await prisma.payroll.findMany({
                where: {
                    status: 'SELESAI',
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
        const now = new Date();
        if (groupBy === 'year') {
            return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
                .toISOString().split('T')[0];
        } else {
            // Default to 6 months for monthly grouping
            return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
                .toISOString().split('T')[0];
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
}

module.exports = new StatisticsService(); 