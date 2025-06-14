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
                page: Number(page),
                limit: Number(limit),
                where,
                include: {
                    programSiswa: {
                        include: {
                            siswa: {
                                select: {
                                    id: true,
                                    namaMurid: true,
                                    nis: true,
                                    noWhatsapp: true
                                }
                            },
                            program: {
                                select: {
                                    id: true,
                                    namaProgram: true
                                }
                            },
                            kelasProgram: {
                                select: {
                                    id: true,
                                    hari: true,
                                    jamMengajar: {
                                        select: {
                                            jamMulai: true,
                                            jamSelesai: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    pembayaran: {
                        select: {
                            id: true,
                            tanggalPembayaran: true,
                            jumlahTagihan: true,
                            statusPembayaran: true,
                            metodePembayaran: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            const formattedData = result.data.map(spp => ({
                id: spp.id,
                siswa: {
                    id: spp.programSiswa.siswa.id,
                    nama: spp.programSiswa.siswa.namaMurid,
                    nis: spp.programSiswa.siswa.nis,
                    noWhatsapp: spp.programSiswa.siswa.noWhatsapp
                },
                program: {
                    id: spp.programSiswa.program.id,
                    nama: spp.programSiswa.program.namaProgram
                },
                kelas: spp.programSiswa.kelasProgram ? {
                    id: spp.programSiswa.kelasProgram.id,
                    hari: spp.programSiswa.kelasProgram.hari,
                    jam: {
                        mulai: spp.programSiswa.kelasProgram.jamMengajar.jamMulai,
                        selesai: spp.programSiswa.kelasProgram.jamMengajar.jamSelesai
                    }
                } : null,
                periode: {
                    bulan: spp.bulan,
                    tahun: spp.tahun,
                    tanggalTagihan: spp.tanggalTagihan
                },
                pembayaran: spp.pembayaran ? {
                    id: spp.pembayaran.id,
                    tanggal: spp.pembayaran.tanggalPembayaran,
                    jumlah: Number(spp.pembayaran.jumlahTagihan),
                    status: spp.pembayaran.statusPembayaran,
                    metode: spp.pembayaran.metodePembayaran
                } : null,
                tagihan: {
                    jumlah: Number(spp.jumlahTagihan),
                    diskon: Number(spp.diskon),
                    total: Number(spp.totalTagihan)
                }
            }));

            return {
                data: formattedData,
                pagination: result.pagination
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
                            id: true,
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

            const data = result.data.map(spp => ({
                id: spp.id,
                program: spp.programSiswa.program.namaProgram,
                bulan: spp.bulan,
                tahun: spp.tahun,
                tanggalTagihan: spp.tanggalTagihan,
                tanggalPembayaran: spp.pembayaran?.tanggalPembayaran || null,
                jumlahTagihan: Number(spp.jumlahTagihan),
                diskon: Number(spp.diskon),
                totalTagihan: Number(spp.totalTagihan),
                idPembayaran: spp.pembayaran?.id,
                statusPembayaran: spp.pembayaran?.statusPembayaran,
                isPaid: !!spp.pembayaran?.statusPembayaran && ['PAID', 'SETTLED'].includes(spp.pembayaran.statusPembayaran)
            }));

            return {
                data,
                pagination: result.pagination
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

    async getSppInvoice(pembayaranId) {
        // Ambil pembayaran dan relasi
        const pembayaran = await prisma.pembayaran.findUnique({
            where: { id: pembayaranId },
            include: {
                periodeSpp: {
                    include: {
                        programSiswa: {
                            include: {
                                siswa: true
                            }
                        }
                    }
                }
            }
        });

        if (!pembayaran) throw new NotFoundError('Pembayaran tidak ditemukan');
        if (pembayaran.statusPembayaran !== 'PAID') throw new BadRequestError('Invoice hanya tersedia untuk transaksi yang sudah dibayar');

        const periode = pembayaran.periodeSpp;
        if (!periode) throw new NotFoundError('Data periode SPP tidak ditemukan');

        const siswa = periode.programSiswa.siswa;

        return {
            invoiceNumber: pembayaran.id,
            date: pembayaran.tanggalPembayaran,
            for: {
                nama: siswa.namaMurid,
                email: siswa.user?.email,
                noWhatsapp: siswa.noWhatsapp
            },
            paymentMethod: pembayaran.metodePembayaran,
            deskripsi: `SPP Bulan ${periode.bulan}`,
            qty: 1,
            biaya: Number(periode.jumlahTagihan),
            total: Number(periode.jumlahTagihan)
        };
    }
}

module.exports = new SppService();