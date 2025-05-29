const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');

class PayrollService {

  async updatePayroll(id, data) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          guru: true,
          absensiGuru: true
        }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      if (payroll.status === 'SELESAI') {
        throw new BadRequestError('Payroll yang sudah selesai tidak dapat diubah');
      }

      const { gajiPokok, insentif, potongan, status } = data;

      const updateData = {};

      if (gajiPokok !== undefined) {
        updateData.gajiPokok = Number(gajiPokok);
      }

      if (insentif !== undefined) {
        updateData.insentif = Number(insentif);
      }

      if (potongan !== undefined) {
        updateData.potongan = Number(potongan);
      }

      if (status !== undefined) {
        updateData.status = status;
      }

      const currentGajiPokok = updateData.gajiPokok ?? payroll.gajiPokok;
      const currentInsentif = updateData.insentif ?? payroll.insentif;
      const currentPotongan = updateData.potongan ?? payroll.potongan;

      updateData.totalGaji = Number(currentGajiPokok) + Number(currentInsentif) - Number(currentPotongan);

      if (updateData.totalGaji < 0) {
        throw new BadRequestError('Total gaji tidak boleh negatif');
      }

      const updated = await prisma.payroll.update({
        where: { id },
        data: updateData,
        include: {
          guru: {
            select: {
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true
            }
          },
          payrollDisbursement: true
        }
      });

      logger.info(`Updated payroll with ID: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating payroll with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllPayrollsForAdmin(filters = {}) {
    try {
      const { page = 1, limit = 10, bulan } = filters;

      const where = {};

      if (bulan) {
        where.bulan = bulan;
      }

      const result = await PrismaUtils.paginate(prisma.payroll, {
        page,
        limit,
        where,
        include: {
          guru: {
            select: {
              id: true,
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true
            }
          },
          absensiGuru: {
            where: {
              tanggal: {
                startsWith: `${where.tahun || new Date().getFullYear()}-${String(where.bulan || new Date().getMonth() + 1).padStart(2, '0')}`
              }
            },
            select: {
              id: true,
              tanggal: true,
              jamMasuk: true,
              jamKeluar: true,
              statusKehadiran: true,
              sks: true,
              terlambat: true,
              menitTerlambat: true,
              potonganTerlambat: true,
              potonganTanpaKabar: true,
              potonganTanpaSuratIzin: true,
              insentifKehadiran: true,
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          },
          payrollDisbursement: {
            include: {
              xenditDisbursement: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedData = result.data.map(payroll => {
        const absensiStats = this.calculateAbsensiStats(payroll.absensiGuru);
        const disbursementStatus = this.getDisbursementStatus(payroll.payrollDisbursement);

        return {
          id: payroll.id,
          guruId: payroll.guruId,
          namaGuru: payroll.guru.nama,
          nip: payroll.guru.nip,
          bulan: payroll.bulan,
          tahun: payroll.tahun,
          periode: payroll.periode,
          totalGaji: Number(payroll.totalGaji),
          status: payroll.status,
          pembayaran: {
            status: disbursementStatus.status,
            tanggalProses: disbursementStatus.tanggalProses,
            metodePembayaran: 'BANK_TRANSFER',
            detailBank: {
              namaBank: payroll.guru.namaBank,
              noRekening: payroll.guru.noRekening
            }
          },
          updatedAt: payroll.updatedAt,
          detail: {
            gajiPokok: Number(payroll.gajiPokok),
            insentif: Number(payroll.insentif),
            potongan: Number(payroll.potongan),
            absensi: {
              totalKehadiran: absensiStats.totalKehadiran,
              totalSKS: absensiStats.totalSKS,
              totalInsentif: absensiStats.totalInsentif,
              totalPotongan: absensiStats.totalPotongan,
              rincianKelas: absensiStats.rincianKelas,
              rincianKehadiran: {
                hadir: absensiStats.rincianKehadiran.hadir,
                izin: absensiStats.rincianKehadiran.izin,
                sakit: absensiStats.rincianKehadiran.sakit,
                tidakHadir: absensiStats.rincianKehadiran.tidakHadir
              }
            }
          }
        };
      });

      return {
        data: formattedData,
        pagination: result.meta
      };
    } catch (error) {
      logger.error('Error getting all payrolls for admin:', error);
      throw error;
    }
  }

  getDisbursementStatus(payrollDisbursement) {
    if (!payrollDisbursement) {
      return {
        status: 'PENDING',
        tanggalProses: null
      };
    }

    if (payrollDisbursement.xenditDisbursement) {
      return {
        status: payrollDisbursement.xenditDisbursement.xenditStatus,
        tanggalProses: payrollDisbursement.tanggalProses
      };
    }

    return {
      status: 'DIPROSES',
      tanggalProses: payrollDisbursement.tanggalProses
    };
  }

  calculateAbsensiStats(absensiList) {
    const stats = {
      totalKehadiran: 0,
      totalSKS: 0,
      totalInsentif: 0,
      totalPotongan: 0,
      rincianKelas: {
        GROUP: { sks: 0, honor: 0 },
        PRIVATE: { sks: 0, honor: 0 },
        SUBSTITUTE: { sks: 0, honor: 0 },
        ONLINE: { sks: 0, honor: 0 }
      },
      rincianKehadiran: {
        hadir: 0,
        izin: 0,
        sakit: 0,
        tidakHadir: 0
      }
    };

    const HONOR_RATES = {
      GROUP: 35000,
      PRIVATE: 35000,
      SUBSTITUTE: 25000,
      ONLINE: 25000
    };

    absensiList.forEach(absensi => {
      stats.rincianKehadiran[absensi.statusKehadiran.toLowerCase()]++;

      if (absensi.statusKehadiran === 'HADIR') {
        stats.totalKehadiran++;
        stats.totalSKS += absensi.sks;

        // Calculate honor based on class type
        const tipeKelas = absensi.kelasProgram.tipeKelas;
        stats.rincianKelas[tipeKelas].sks += absensi.sks;
        stats.rincianKelas[tipeKelas].honor += absensi.sks * HONOR_RATES[tipeKelas];

        if (absensi.insentifKehadiran) {
          stats.totalInsentif += Number(absensi.insentifKehadiran);
        }
      }

      // Calculate penalties
      if (absensi.potonganTerlambat) {
        stats.totalPotongan += Number(absensi.potonganTerlambat);
      }
      if (absensi.potonganTanpaKabar) {
        stats.totalPotongan += Number(absensi.potonganTanpaKabar);
      }
      if (absensi.potonganTanpaSuratIzin) {
        stats.totalPotongan += Number(absensi.potonganTanpaSuratIzin);
      }
    });

    return stats;
  }


  async getAllPayrollsForGuru(guruId, filters = {}) {
    try {
      const { page = 1, limit = 10, bulan } = filters;

      const where = {
        guruId
      };

      if (bulan) {
        where.bulan = bulan;
      }

      const result = await PrismaUtils.paginate(prisma.payroll, {
        page,
        limit,
        where,
        include: {
          guru: {
            select: {
              id: true,
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true
            }
          },
          absensiGuru: {
            where: {
              tanggal: {
                startsWith: `${where.tahun || new Date().getFullYear()}-${String(where.bulan || new Date().getMonth() + 1).padStart(2, '0')}`
              }
            },
            select: {
              id: true,
              tanggal: true,
              jamMasuk: true,
              jamKeluar: true,
              statusKehadiran: true,
              sks: true,
              terlambat: true,
              menitTerlambat: true,
              potonganTerlambat: true,
              potonganTanpaKabar: true,
              potonganTanpaSuratIzin: true,
              insentifKehadiran: true,
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          },
          payrollDisbursement: {
            include: {
              xenditDisbursement: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      logger.info(result.data);

      const formattedData = result.data.map(payroll => {
        const absensiStats = this.calculateAbsensiStats(payroll.absensiGuru);
        const disbursementStatus = this.getDisbursementStatus(payroll.payrollDisbursement);

        return {
          id: payroll.id,
          bulan: payroll.bulan,
          tahun: payroll.tahun,
          periode: payroll.periode,
          totalGaji: Number(payroll.totalGaji),
          status: payroll.status,
          pembayaran: {
            status: disbursementStatus.status,
            tanggalProses: disbursementStatus.tanggalProses,
            metodePembayaran: 'BANK_TRANSFER',
            detailBank: {
              namaBank: payroll.guru.namaBank,
              noRekening: payroll.guru.noRekening
            }
          },
          updatedAt: payroll.updatedAt,
          detail: {
            gajiPokok: Number(payroll.gajiPokok),
            insentif: Number(payroll.insentif),
            potongan: Number(payroll.potongan),
            absensi: {
              totalKehadiran: absensiStats.totalKehadiran,
              totalSKS: absensiStats.totalSKS,
              totalInsentif: absensiStats.totalInsentif,
              totalPotongan: absensiStats.totalPotongan,
              rincianKelas: absensiStats.rincianKelas,
              rincianKehadiran: {
                hadir: absensiStats.rincianKehadiran.hadir,
                izin: absensiStats.rincianKehadiran.izin,
                sakit: absensiStats.rincianKehadiran.sakit,
                tidakHadir: absensiStats.rincianKehadiran.tidakHadir
              }
            }
          }
        };
      });

      return {
        data: formattedData,
        pagination: result.meta
      };
    } catch (error) {
      logger.error('Error getting payrolls for guru:', error);
      throw error;
    }
  }
}

module.exports = new PayrollService();