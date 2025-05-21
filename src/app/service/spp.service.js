const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class SppService {


    // TODO: FILTER MASIH GAJALAN
    async getSppForAdmin(filters = {}) {
        try {
            const {
                status,
                bulan,
                namaSiswa,
                page = 1,
                limit = 10
            } = filters;

            const where = {};

            // Filter by status
            if (status) {
                where.pembayaran = {
                    statusPembayaran: status
                };
            }

            // Filter by month
            if (bulan) {
                where.bulan = bulan;
            }

            // Filter by student name
            if (namaSiswa) {
                where.programSiswa = {
                    siswa: {
                        namaMurid: {
                            contains: namaSiswa,
                            mode: 'insensitive'
                        }
                    }
                };
            }

            // Get data with pagination
            const result = await PrismaUtils.paginate(prisma.periodeSpp, {
                page,
                limit,
                where,
                include: {
                    programSiswa: {
                        include: {
                            siswa: {
                                select: {
                                    namaMurid: true,
                                    nis: true
                                }
                            },
                            program: {
                                select: {
                                    namaProgram: true
                                }
                            }
                        }
                    },
                    pembayaran: {
                        select: {
                            tanggalPembayaran: true,
                            jumlahTagihan: true,
                            statusPembayaran: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            // Format response data
            const formattedData = result.data.map(spp => ({
                id: spp.id,
                namaSiswa: spp.programSiswa.siswa.namaMurid,
                nis: spp.programSiswa.siswa.nis,
                program: spp.programSiswa.program.namaProgram,
                tanggalTagihan: spp.tanggalTagihan,
                tanggalPembayaran: spp.pembayaran?.tanggalPembayaran || null,
                jumlahBayar: spp.pembayaran?.jumlahTagihan || null,
                statusPembayaran: spp.pembayaran?.statusPembayaran || 'UNPAID'
            }));

            return formattedData;
        } catch (error) {
            logger.error('Error getting SPP data for admin:', error);
            throw error;
        }
    }

    async getSppForSiswa(userId, filters = {}) {
        try {
            const {  page = 1, limit = 10 } = filters;

            // Find the siswa based on userId
            const siswa = await prisma.siswa.findUnique({
                where: { userId }
            });

            if (!siswa) {
                throw new NotFoundError('Data siswa tidak ditemukan');
            }

            // Find all program-siswa relationships
            const programSiswaIds = await prisma.programSiswa.findMany({
                where: { siswaId: siswa.id },
                select: { id: true }
            });

            if (programSiswaIds.length === 0) {
                return [];
            }

            // Build where clause
            const where = {
                programSiswaId: {
                    in: programSiswaIds.map(ps => ps.id)
                }
            };


            const result = await PrismaUtils.paginate(prisma.periodeSpp, {
                page,
                limit,
                where,
                include: {
                    programSiswa: {
                        include: {
                            program: {
                                select: {
                                    namaProgram: true
                                }
                            }
                        }
                    },
                    pembayaran: {
                        select: {
                            tanggalPembayaran: true,
                            jumlahTagihan: true,
                            statusPembayaran: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            const formattedData = result.data.map(spp => ({
                id: spp.id,
                program: spp.programSiswa.program.namaProgram,
                bulan: spp.bulan,
                tanggalTagihan: spp.tanggalTagihan,
                tanggalPembayaran: spp.pembayaran?.tanggalPembayaran || null,
                jumlahBayar: spp.pembayaran?.jumlahTagihan || null,
                statusPembayaran: spp.pembayaran?.statusPembayaran || 'UNPAID'
            }));

            return formattedData;
        } catch (error) {
            logger.error('Error getting SPP data for student:', error);
            throw error;
        }
    }
}

module.exports = new SppService();
