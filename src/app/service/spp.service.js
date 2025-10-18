const prisma = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const financeService = require('./finance.service');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const logger = require('../../lib/config/logger.config');
const moment = require("moment")

class SppService {
    async getSppForAdmin(options = {}) {
        try {
            const { filters = {} } = options;
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
                            totalTagihan: true,
                            statusPembayaran: true,
                            metodePembayaran: true
                        }
                    }
                },
                orderBy: [
                    { tahun: 'asc' },
                    { tanggalTagihan: 'asc' }
                ]
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
                    jumlah: Number(spp.pembayaran.totalTagihan),
                    status: spp.pembayaran.statusPembayaran,
                    metode: spp.pembayaran.metodePembayaran
                } : null,
                tagihan: {
                    total: Number(spp.jumlahTagihan)
                }
            }));

            return {
                data: formattedData,
                meta: result.pagination
            };
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }

    async getSppForSiswa(userId, options = {}) {
        try {
            const { filters = {} } = options;
            const { page = 1, limit = 10 } = filters;

            const siswa = await prisma.siswa.findUnique({
                where: { userId }
            });

            if (!siswa) {
                throw ErrorFactory.notFound('Data siswa tidak ditemukan');
            }

            const programSiswaIds = await prisma.programSiswa.findMany({
                where: { siswaId: siswa.id },
                select: { id: true }
            });

            if (programSiswaIds.length === 0) {
                return {
                    data: [],
                    meta: {
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
                            totalTagihan: true,
                            statusPembayaran: true
                        }
                    }
                },
                orderBy: [
                    { tahun: 'asc' },
                    { tanggalTagihan: 'asc' }
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
                diskon: 0, // Diskon tidak tersimpan di PeriodeSpp
                totalTagihan: Number(spp.jumlahTagihan), // Total sama dengan jumlah tagihan
                idPembayaran: spp.pembayaran?.id,
                statusPembayaran: spp.pembayaran?.statusPembayaran,
                isPaid: !!spp.pembayaran?.statusPembayaran && ['SETTLEMENT'].includes(spp.pembayaran.statusPembayaran)
            })).sort((a, b) => {
                if (a.tahun !== b.tahun) {
                    return a.tahun - b.tahun;
                }
                const monthA = CommonServiceUtils.getMonthNumber(a.bulan);
                const monthB = CommonServiceUtils.getMonthNumber(b.bulan);
                return monthA - monthB;
            });

            return {
                data,
                meta: result.pagination
            };
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }

    async createSppPayment(userId, data) {
        try {
            const { periodeSppIds, kodeVoucher, metodePembayaran, evidence } = data;

            const siswa = await prisma.siswa.findUnique({
                where: { userId },
                include: {
                    user: true
                }
            });

            if (!siswa) {
                throw ErrorFactory.notFound('Data siswa tidak ditemukan');
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
                throw ErrorFactory.badRequest('Beberapa periode SPP tidak valid atau tidak ditemukan');
            }

            const paidSpp = periodeSppList.filter(spp => spp.pembayaran);
            if (paidSpp.length > 0) {
                throw ErrorFactory.badRequest(`${paidSpp.length} periode SPP sudah dibayar`);
            }

            let totalAmount = periodeSppList.reduce((sum, spp) => sum + Number(spp.jumlahTagihan), 0);
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
                    throw ErrorFactory.notFound('Voucher tidak valid atau tidak aktif');
                }

                voucherId = voucher.id;

                if (voucher.tipe === 'NOMINAL') {
                    discountAmount = Math.min(Number(voucher.nominal), totalAmount);
                } else if (voucher.tipe === 'PERSENTASE') {
                    if (Number(voucher.nominal) < 0 || Number(voucher.nominal) > 100) {
                        throw ErrorFactory.badRequest(`Persentase diskon harus antara 0-100%. Saat ini: ${voucher.nominal}%`);
                    }

                    discountAmount = totalAmount * (Number(voucher.nominal) / 100);
                }
            }

            const finalAmount = totalAmount - discountAmount;

            if (finalAmount < 1000) {
                throw ErrorFactory.badRequest(`Total biaya setelah diskon minimal Rp 1.000. Saat ini: Rp ${finalAmount.toLocaleString('id-ID')}`);
            }

            const periods = periodeSppList.map(spp => ({
                bulan: spp.bulan,
                tahun: spp.tahun,
                program: spp.programSiswa.program.namaProgram
            }));

            const monthYears = [...new Set(periods.map(p => `${p.bulan} ${p.tahun}`))].join(', ');
            const programs = [...new Set(periods.map(p => p.program))].join(', ');

            // Jika pembayaran tunai, langsung proses pembayaran
            if (metodePembayaran === 'TUNAI') {
                return await this.processTunaiSppPayment({
                    siswa,
                    periodeSppList,
                    periodeSppIds,
                    periods: monthYears,
                    programs,
                    originalAmount: totalAmount,
                    discountAmount,
                    finalAmount,
                    voucherId,
                    kodeVoucher,
                    evidence
                });
            }

            // Jika payment gateway, return data untuk buat invoice
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
            logger.error(error);
            throw error;
        }
    }

    async processTunaiSppPayment(data) {
        const {
            siswa,
            periodeSppList,
            periodeSppIds,
            periods,
            programs,
            originalAmount,
            discountAmount,
            finalAmount,
            voucherId,
            kodeVoucher,
            evidence
        } = data;

        try {
            // Buat pembayaran dengan status PAID
            const pembayaran = await prisma.pembayaran.create({
                data: {
                    tipePembayaran: 'SPP',
                    metodePembayaran: 'TUNAI',
                    totalTagihan: finalAmount,
                    statusPembayaran: 'SETTLEMENT',
                    tanggalPembayaran: new Date().toISOString().split('T')[0],
                    evidence: evidence
                }
            });

            // Update semua periode SPP dengan pembayaran ID
            await prisma.periodeSpp.updateMany({
                where: {
                    id: { in: periodeSppIds }
                },
                data: {
                    pembayaranId: pembayaran.id
                }
            });

            // Update voucher usage jika ada
            if (voucherId) {
                await prisma.voucher.update({
                    where: { id: voucherId },
                    data: {
                        usedCount: {
                            increment: 1
                        }
                    }
                });
            }

            // Sync ke finance record

            const tanggalPembayaran = CommonServiceUtils.getCurrentDate('DD-MM-YYYY');

            await financeService.createFromSppPayment({
                id: pembayaran.id,
                totalTagihan: finalAmount,
                tanggalPembayaran: tanggalPembayaran,
                metodePembayaran: 'TUNAI'
            });


            return {
                success: true,
                message: 'Pembayaran SPP tunai berhasil',
                pembayaran: pembayaran,
                siswa: {
                    id: siswa.id,
                    nama: siswa.namaMurid,
                    email: siswa.user.email,
                    noWhatsapp: siswa.noWhatsapp,
                    alamat: siswa.alamat
                },
                payment: {
                    periodeSppIds,
                    periods,
                    programs,
                    originalAmount,
                    discountAmount,
                    finalAmount,
                    voucherId,
                    kodeVoucher
                }
            };
        } catch (error) {
            logger.error(error);
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

        if (!pembayaran) throw ErrorFactory.notFound('Pembayaran tidak ditemukan');
        if (pembayaran.statusPembayaran !== 'SETTLEMENT') throw ErrorFactory.badRequest('Invoice hanya tersedia untuk transaksi yang sudah dibayar');

        const periode = pembayaran.periodeSpp;
        if (!periode) throw ErrorFactory.notFound('Data periode SPP tidak ditemukan');

        const siswa = periode.programSiswa.siswa;

        // Gunakan nominal dari pembayaran (sudah final amount setelah voucher)
        const finalAmount = CommonServiceUtils.safeNumber(pembayaran.totalTagihan);
        const originalAmount = CommonServiceUtils.safeNumber(periode.jumlahTagihan);
        const discount = CommonServiceUtils.safeNumber(pembayaran.discount || 0);

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
                throw new Error('Program siswa tidak ditemukan');
            }

            const registrationDate = moment(tanggalDaftar, 'DD-MM-YYYY');
            const biayaSpp = CommonServiceUtils.safeNumber(programSiswa.program.biayaSpp);
            const createdSppRecords = [];

            // Generate SPP untuk 5 bulan ke depan
            for (let i = 1; i <= 5; i++) {
                const sppMonth = registrationDate.clone().add(i, 'months');
                const bulan = this.getMonthName(sppMonth.month() + 1);
                const tahun = sppMonth.year();
                const tanggalTagihan = CommonServiceUtils.formatDate(sppMonth);

                // Check if SPP already exists for this month
                const existingSpp = await db.periodeSpp.findFirst({
                    where: {
                        programSiswaId,
                        bulan,
                        tahun
                    }
                });

                if (existingSpp) {
                    continue;
                }

                // Create SPP record
                const sppRecord = await db.periodeSpp.create({
                    data: {
                        programSiswaId,
                        bulan,
                        tahun,
                        tanggalTagihan,
                        jumlahTagihan: biayaSpp
                    }
                });

                createdSppRecords.push(sppRecord);
            }

            return createdSppRecords;

        } catch (error) {
            logger.error(error);
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

    getMonthNumber(monthName) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months.indexOf(monthName) + 1;
    }

    async generateSingleSpp(programSiswaId, monthOffset = 1, tx = null) {
        try {
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
            const tanggalTagihan = CommonServiceUtils.formatDate(targetMonth);
            const biayaSpp = CommonServiceUtils.safeNumber(programSiswa.program.biayaSpp);

            // Check if SPP already exists
            const existingSpp = await db.periodeSpp.findFirst({
                where: {
                    programSiswaId,
                    bulan,
                    tahun
                }
            });

            if (existingSpp) {
                return existingSpp;
            }

            // Create SPP record
            const sppRecord = await db.periodeSpp.create({
                data: {
                    programSiswaId,
                    bulan,
                    tahun,
                    tanggalTagihan,
                    jumlahTagihan: biayaSpp
                }
            });

            return sppRecord;

        } catch (error) {
            logger.error(error);
            throw error;
        }
    }
}

module.exports = new SppService();