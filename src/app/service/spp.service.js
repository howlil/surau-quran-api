// src/app/service/spp.service.js
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');

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
                // Parse format MM-YYYY menjadi bulan nama dan tahun
                const [monthNumber, year] = bulan.split('-');
                const monthName = this.getMonthName(parseInt(monthNumber));

                where.bulan = monthName;
                where.tahun = parseInt(year);
            }

            if (namaSiswa) {
                where.programSiswa = {
                    siswa: {
                        namaMurid: {
                            contains: namaSiswa
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
                    if (Number(voucher.nominal) > 100) {
                        throw new BadRequestError(`Persentase diskon tidak boleh lebih dari 100%`);
                    }

                    discountAmount = totalAmount * (Number(voucher.nominal) / 100);
                }
            }

            const finalAmount = totalAmount - discountAmount;

            if (finalAmount < 1000) {
                throw new BadRequestError(`Total biaya setelah diskon minimal Rp 1.000. Saat ini: Rp ${finalAmount.toLocaleString('id-ID')}`);
            }

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
                    email: siswa.user.email,
                    noWhatsapp: siswa.noWhatsapp,
                    alamat: siswa.alamat
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
                        },
                        voucher: {
                            select: {
                                kodeVoucher: true,
                                namaVoucher: true,
                                tipe: true,
                                nominal: true
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

        // Gunakan nominal dari pembayaran (sudah final amount setelah voucher)
        const finalAmount = Number(pembayaran.jumlahTagihan);
        const originalAmount = Number(periode.jumlahTagihan);
        const discount = Number(periode.diskon) || 0;

        return {
            invoiceNumber: pembayaran.id,
            date: pembayaran.tanggalPembayaran,
            for: {
                nama: siswa.namaMurid,
                email: siswa.user?.email,
                noWhatsapp: siswa.noWhatsapp
            },
            paymentMethod: pembayaran.metodePembayaran,
            deskripsi: `SPP Bulan ${periode.bulan} ${periode.tahun}`,
            qty: 1,
            biaya: finalAmount, // Gunakan nominal final dari pembayaran
            total: finalAmount, // Gunakan nominal final dari pembayaran
            originalAmount: originalAmount,
            discount: discount,
            voucher: periode.voucher ? {
                kode: periode.voucher.kodeVoucher,
                nama: periode.voucher.namaVoucher,
                tipe: periode.voucher.tipe,
                nominal: Number(periode.voucher.nominal)
            } : null
        };
    }


    async generateFiveMonthsAhead(programSiswaId, tanggalDaftar = new Date(), tx = null) {
        try {
            logger.info(`Generating 5 months SPP for programSiswa: ${programSiswaId}`);

            // Use transaction context if provided, otherwise use global prisma
            const db = tx || prisma;

            // Get program siswa details including program info
            const programSiswa = await db.programSiswa.findUnique({
                where: { id: programSiswaId },
                include: {
                    program: {
                        select: {
                            biayaSpp: true,
                            namaProgram: true
                        }
                    },
                    siswa: {
                        select: {
                            namaMurid: true
                        }
                    }
                }
            });

            if (!programSiswa) {
                logger.error(`ProgramSiswa not found: ${programSiswaId}`);
                throw new Error('Program siswa tidak ditemukan');
            }

            const registrationDate = moment(tanggalDaftar, DATE_FORMATS.DEFAULT);
            const biayaSpp = Number(programSiswa.program.biayaSpp);
            const createdSppRecords = [];

            // Generate SPP untuk 5 bulan ke depan
            for (let i = 1; i <= 5; i++) {
                const sppMonth = registrationDate.clone().add(i, 'months');
                const bulan = this.getMonthName(sppMonth.month() + 1);
                const tahun = sppMonth.year();
                const tanggalTagihan = sppMonth.format(DATE_FORMATS.DEFAULT);

                // Check if SPP already exists for this month
                const existingSpp = await db.periodeSpp.findFirst({
                    where: {
                        programSiswaId,
                        bulan,
                        tahun
                    }
                });

                if (existingSpp) {
                    logger.info(`SPP already exists for ${programSiswa.siswa.namaMurid} - ${bulan} ${tahun}`);
                    continue;
                }

                // Create SPP record
                const sppRecord = await db.periodeSpp.create({
                    data: {
                        programSiswaId,
                        bulan,
                        tahun,
                        tanggalTagihan,
                        jumlahTagihan: biayaSpp,
                        diskon: 0,
                        totalTagihan: biayaSpp
                    }
                });

                createdSppRecords.push(sppRecord);
                logger.info(`Created SPP for ${programSiswa.siswa.namaMurid} - ${bulan} ${tahun}: Rp ${biayaSpp.toLocaleString('id-ID')}`);
            }

            logger.info(`Successfully generated ${createdSppRecords.length} SPP records for ${programSiswa.siswa.namaMurid}`);
            return createdSppRecords;

        } catch (error) {
            logger.error('Error generating SPP 5 months ahead:', error);
            throw error;
        }
    }

    getMonthName(month) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months[month - 1];
    }

    /**
     * Generate single SPP for specific month
     * @param {string} programSiswaId 
     * @param {number} monthOffset - Offset dari bulan sekarang (1 = bulan depan)
     * @param {Object} tx - Optional transaction context
     * @returns {Promise<Object>} Created SPP record
     */
    async generateSingleSpp(programSiswaId, monthOffset = 1, tx = null) {
        try {
            // Use transaction context if provided, otherwise use global prisma
            const db = tx || prisma;

            const programSiswa = await db.programSiswa.findUnique({
                where: { id: programSiswaId },
                include: {
                    program: {
                        select: {
                            biayaSpp: true
                        }
                    }
                }
            });

            if (!programSiswa) {
                throw new Error('Program siswa tidak ditemukan');
            }

            const targetMonth = moment().add(monthOffset, 'months');
            const bulan = this.getMonthName(targetMonth.month() + 1);
            const tahun = targetMonth.year();
            const tanggalTagihan = targetMonth.format(DATE_FORMATS.DEFAULT);
            const biayaSpp = Number(programSiswa.program.biayaSpp);

            // Check if SPP already exists
            const existingSpp = await db.periodeSpp.findFirst({
                where: {
                    programSiswaId,
                    bulan,
                    tahun
                }
            });

            if (existingSpp) {
                logger.info(`SPP already exists for ${bulan} ${tahun}`);
                return existingSpp;
            }

            // Create SPP record
            const sppRecord = await db.periodeSpp.create({
                data: {
                    programSiswaId,
                    bulan,
                    tahun,
                    tanggalTagihan,
                    jumlahTagihan: biayaSpp,
                    diskon: 0,
                    totalTagihan: biayaSpp
                }
            });

            logger.info(`Created single SPP for ${bulan} ${tahun}: Rp ${biayaSpp.toLocaleString('id-ID')}`);
            return sppRecord;

        } catch (error) {
            logger.error('Error generating single SPP:', error);
            throw error;
        }
    }
}

module.exports = new SppService();