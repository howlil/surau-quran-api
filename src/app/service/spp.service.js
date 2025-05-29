// src/app/service/spp.service.js
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class SppService {
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

            if (status) {
                where.pembayaran = {
                    statusPembayaran: status
                };
            }

            if (bulan) {
                where.bulan = bulan;
            }

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

            const formattedData = result.data.map(spp => ({
                id: spp.id,
                namaSiswa: spp.programSiswa.siswa.namaMurid,
                nis: spp.programSiswa.siswa.nis,
                program: spp.programSiswa.program.namaProgram,
                bulan: spp.bulan,
                tahun: spp.tahun,
                tanggalTagihan: spp.tanggalTagihan,
                tanggalPembayaran: spp.pembayaran?.tanggalPembayaran || null,
                jumlahBayar: spp.pembayaran?.jumlahTagihan || null,
                statusPembayaran: spp.pembayaran?.statusPembayaran || 'UNPAID'
            }));

            return {
                data: formattedData,
                pagination: result.meta
            };
        } catch (error) {
            logger.error('Error getting SPP data for admin:', error);
            throw error;
        }
    }

    async getSppForSiswa(userId, filters = {}) {
        try {
            const { page = 1, limit = 10 } = filters;

            const siswa = await prisma.siswa.findUnique({
                where: { userId }
            });

            if (!siswa) {
                throw new NotFoundError('Data siswa tidak ditemukan');
            }

            const programSiswaIds = await prisma.programSiswa.findMany({
                where: { siswaId: siswa.id },
                select: { id: true }
            });

            if (programSiswaIds.length === 0) {
                return {
                    data: [],
                    pagination: {
                        total: 0,
                        limit,
                        page,
                        totalPages: 0
                    }
                };
            }

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
                orderBy: [
                    { tahun: 'desc' },
                    { tanggalTagihan: 'desc' }
                ]
            });

            const formattedData = result.data.map(spp => ({
                id: spp.id,
                program: spp.programSiswa.program.namaProgram,
                bulan: spp.bulan,
                tahun: spp.tahun,
                tanggalTagihan: spp.tanggalTagihan,
                tanggalPembayaran: spp.pembayaran?.tanggalPembayaran || null,
                jumlahTagihan: Number(spp.jumlahTagihan),
                diskon: Number(spp.diskon),
                totalTagihan: Number(spp.totalTagihan),
                statusPembayaran: spp.pembayaran?.statusPembayaran || 'UNPAID',
                isPaid: !!spp.pembayaran?.statusPembayaran && ['PAID', 'SETTLED'].includes(spp.pembayaran.statusPembayaran)
            }));

            return {
                data: formattedData,
                pagination: result.meta
            };
        } catch (error) {
            logger.error('Error getting SPP data for student:', error);
            throw error;
        }
    }

    async createSppPayment(userId, data) {
        try {
            const { periodeSppIds, kodeVoucher } = data;

            const siswa = await prisma.siswa.findUnique({
                where: { userId },
                include: {
                    user: true
                }
            });

            if (!siswa) {
                throw new NotFoundError('Data siswa tidak ditemukan');
            }

            const periodeSppList = await prisma.periodeSpp.findMany({
                where: {
                    id: { in: periodeSppIds },
                    programSiswa: {
                        siswaId: siswa.id
                    }
                },
                include: {
                    programSiswa: {
                        include: {
                            program: true
                        }
                    },
                    pembayaran: true
                }
            });

            if (periodeSppList.length !== periodeSppIds.length) {
                throw new BadRequestError('Beberapa periode SPP tidak valid atau tidak ditemukan');
            }

            const paidSpp = periodeSppList.filter(spp => spp.pembayaran);
            if (paidSpp.length > 0) {
                throw new BadRequestError(`${paidSpp.length} periode SPP sudah dibayar`);
            }

            let totalAmount = periodeSppList.reduce((sum, spp) => sum + Number(spp.totalTagihan), 0);
            let discountAmount = 0;
            let voucherId = null;

            if (kodeVoucher) {
                const voucher = await prisma.voucher.findUnique({
                    where: {
                        kodeVoucher: kodeVoucher.toUpperCase(),
                        isActive: true
                    }
                });

                if (!voucher) {
                    throw new NotFoundError('Voucher tidak valid atau tidak aktif');
                }

                if (voucher.jumlahPenggunaan <= 0) {
                    throw new BadRequestError('Voucher sudah habis digunakan');
                }

                voucherId = voucher.id;

                if (voucher.tipe === 'NOMINAL') {
                    discountAmount = Math.min(Number(voucher.nominal), totalAmount);
                } else if (voucher.tipe === 'PERSENTASE') {
                    discountAmount = totalAmount * (Number(voucher.nominal) / 100);
                }
            }

            const finalAmount = totalAmount - discountAmount;

            const periods = periodeSppList.map(spp => ({
                bulan: spp.bulan,
                tahun: spp.tahun,
                program: spp.programSiswa.program.namaProgram
            }));

            const monthYears = [...new Set(periods.map(p => `${p.bulan} ${p.tahun}`))].join(', ');
            const programs = [...new Set(periods.map(p => p.program))].join(', ');

            return {
                siswa: {
                    id: siswa.id,
                    nama: siswa.namaMurid,
                    email: siswa.user.email
                },
                payment: {
                    periodeSppIds,
                    periods: monthYears,
                    programs,
                    originalAmount: totalAmount,
                    discountAmount,
                    finalAmount,
                    voucherId,
                    kodeVoucher
                }
            };
        } catch (error) {
            logger.error('Error creating SPP payment:', error);
            throw error;
        }
    }

   
}

module.exports = new SppService();