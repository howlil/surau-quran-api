const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class PayrollService {
  async createPayroll(data) {
    try {
      const { guruId, periode, bulan, tahun, gajiPokok, insentif = 0, potongan = 0 } = data;

      const guru = await prisma.guru.findUnique({
        where: { id: guruId }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${guruId} tidak ditemukan`);
      }

      const existingPayroll = await prisma.payroll.findFirst({
        where: {
          guruId,
          periode,
          tahun
        }
      });

      if (existingPayroll) {
        throw new ConflictError(`Payroll untuk guru ${guru.nama} periode ${periode} ${tahun} sudah ada`);
      }

      const totalGaji = Number(gajiPokok) + Number(insentif) - Number(potongan);

      if (totalGaji < 0) {
        throw new BadRequestError('Total gaji tidak boleh negatif');
      }

      const payroll = await prisma.payroll.create({
        data: {
          guruId,
          periode,
          bulan,
          tahun,
          gajiPokok: Number(gajiPokok),
          insentif: Number(insentif),
          potongan: Number(potongan),
          totalGaji,
          status: 'DRAFT'
        },
        include: {
          guru: {
            select: {
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true
            }
          }
        }
      });

      logger.info(`Created payroll with ID: ${payroll.id} for guru: ${guru.nama}`);
      return payroll;
    } catch (error) {
      logger.error('Error creating payroll:', error);
      throw error;
    }
  }

  async updatePayroll(id, data) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          guru: true
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
          }
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
      const { page = 1, limit = 10, bulan, tahun, guruId } = filters;

      const where = {};

      if (bulan) {
        where.bulan = bulan;
      }

      if (tahun) {
        where.tahun = Number(tahun);
      }

      if (guruId) {
        where.guruId = guruId;
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
              tarifPerJam: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedData = await Promise.all(result.data.map(async (payroll) => {
        const absensiData = await this.getAbsensiDataForPayroll(payroll.guruId, payroll.bulan, payroll.tahun);
        
        return {
          guruId: payroll.guruId,
          namaGuru: payroll.guru.nama,
          NIP: payroll.guru.nip,
          bulan: payroll.bulan,
          totalGaji: Number(payroll.totalGaji),
          detail: {
            gajiGuruId: payroll.id,
            gajiPokok: Number(payroll.gajiPokok),
            insentif: Number(payroll.insentif),
            absensi: absensiData,
            totalPotongan: Number(payroll.potongan),
            status: payroll.status
          }
        };
      }));

      return {
        data: formattedData,
        meta: result.meta
      };
    } catch (error) {
      logger.error('Error getting all payrolls for admin:', error);
      throw error;
    }
  }

  async getAbsensiDataForPayroll(guruId, bulan, tahun) {
    const monthNumber = this.getMonthNumber(bulan);
    const absensiRecords = await prisma.absensiGuru.findMany({
      where: {
        guruId,
        tanggal: {
          contains: `${tahun}-${String(monthNumber).padStart(2, '0')}`
        }
      }
    });

    const telat = absensiRecords.filter(record => {
      if (record.statusKehadiran !== 'HADIR') return false;
      const jamMasuk = record.jamMasuk;
      const [hour, minute] = jamMasuk.split(':').map(Number);
      return hour > 8 || (hour === 8 && minute > 0);
    }).length;

    const izin = absensiRecords.filter(record => record.statusKehadiran === 'IZIN').length;
    const sakit = absensiRecords.filter(record => record.statusKehadiran === 'SAKIT').length;
    const absen = absensiRecords.filter(record => record.statusKehadiran === 'TIDAK_HADIR').length;

    return {
      telat,
      izin,
      sakit,
      absen
    };
  }

  async getPayrollDetailForEdit(id) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          guru: {
            select: {
              id: true,
              nama: true,
              nip: true,
              tarifPerJam: true
            }
          }
        }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      const absensiData = await this.getAbsensiDataForPayroll(payroll.guruId, payroll.bulan, payroll.tahun);

      return {
        id: payroll.id,
        guruId: payroll.guruId,
        namaGuru: payroll.guru.nama,
        NIP: payroll.guru.nip,
        bulan: payroll.bulan,
        tahun: payroll.tahun,
        periode: payroll.periode,
        gajiPokok: Number(payroll.gajiPokok),
        insentif: Number(payroll.insentif),
        potongan: Number(payroll.potongan),
        totalGaji: Number(payroll.totalGaji),
        status: payroll.status,
        absensi: absensiData,
        tarifPerJam: Number(payroll.guru.tarifPerJam || 0)
      };
    } catch (error) {
      logger.error(`Error getting payroll detail for edit with ID ${id}:`, error);
      throw error;
    }
  }

  async updatePayrollDetail(id, data) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      if (payroll.status === 'SELESAI') {
        throw new BadRequestError('Payroll yang sudah selesai tidak dapat diubah');
      }

      const { gajiPokok, insentif, potongan } = data;

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
              nip: true
            }
          }
        }
      });

      logger.info(`Updated payroll detail with ID: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating payroll detail with ID ${id}:`, error);
      throw error;
    }
  }

  async getPayrollForGuru(guruId, filters = {}) {
    try {
      const { page = 1, limit = 10, bulan, tahun } = filters;

      const where = { guruId };

      if (bulan) {
        where.bulan = bulan;
      }

      if (tahun) {
        where.tahun = Number(tahun);
      }

      const result = await PrismaUtils.paginate(prisma.payroll, {
        page,
        limit,
        where,
        include: {
          guru: {
            select: {
              nama: true,
              nip: true,
              tarifPerJam: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedData = await Promise.all(result.data.map(async (payroll) => {
        const absensiData = await this.getAbsensiDataForPayroll(payroll.guruId, payroll.bulan, payroll.tahun);
        
        return {
          gajiGuruId: payroll.id,
          bulan: payroll.bulan,
          tahun: payroll.tahun,
          tanggal: payroll.createdAt,
          totalGaji: Number(payroll.totalGaji),
          gajiPokok: Number(payroll.gajiPokok),
          insentif: Number(payroll.insentif),
          absensi: absensiData,
          totalPotongan: Number(payroll.potongan),
          status: payroll.status
        };
      }));

      return {
        data: formattedData,
        pagination: result.meta
      };
    } catch (error) {
      logger.error(`Error getting payroll for guru ${guruId}:`, error);
      throw error;
    }
  }

  getMonthNumber(bulanName) {
    const months = {
      'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
      'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
      'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
    };
    return months[bulanName] || 1;
  }

  async generateMonthlyPayroll(data) {
    try {
      const { bulan, tahun, guruIds = [] } = data;

      const periode = `${bulan} ${tahun}`;

      let gurus;
      if (guruIds.length > 0) {
        gurus = await prisma.guru.findMany({
          where: {
            id: { in: guruIds }
          },
          include: {
            payroll: {
              where: {
                periode,
                tahun: Number(tahun)
              }
            }
          }
        });
      } else {
        gurus = await prisma.guru.findMany({
          include: {
            payroll: {
              where: {
                periode,
                tahun: Number(tahun)
              }
            }
          }
        });
      }

      const results = [];
      const errors = [];

      for (const guru of gurus) {
        try {
          if (guru.payroll.length > 0) {
            errors.push({
              guruId: guru.id,
              nama: guru.nama,
              error: `Payroll periode ${periode} sudah ada`
            });
            continue;
          }

          const monthNumber = this.getMonthNumber(bulan);
          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `${tahun}-${String(monthNumber).padStart(2, '0')}`
              },
              statusKehadiran: 'HADIR'
            }
          });

          const totalSKS = absensiData.reduce((sum, absensi) => sum + absensi.sks, 0);
          const gajiPokok = Number(guru.tarifPerJam || 0) * totalSKS;

          const payroll = await this.createPayroll({
            guruId: guru.id,
            periode,
            bulan,
            tahun: Number(tahun),
            gajiPokok,
            insentif: 0,
            potongan: 0
          });

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            totalGaji: payroll.totalGaji
          });
        } catch (error) {
          errors.push({
            guruId: guru.id,
            nama: guru.nama,
            error: error.message
          });
        }
      }

      logger.info(`Generated monthly payroll for ${results.length} teachers`);

      return {
        success: results,
        errors,
        summary: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          periode
        }
      };
    } catch (error) {
      logger.error('Error generating monthly payroll:', error);
      throw error;
    }
  }

  async getPayrollSummary(filters = {}) {
    try {
      const { periode, tahun } = filters;

      const where = {};
      if (periode) {
        where.periode = periode;
      }
      if (tahun) {
        where.tahun = Number(tahun);
      }

      const payrolls = await prisma.payroll.findMany({
        where,
        include: {
          guru: {
            select: {
              nama: true
            }
          }
        }
      });

      const summary = {
        totalPayrolls: payrolls.length,
        totalAmount: payrolls.reduce((sum, p) => sum + Number(p.totalGaji), 0),
        byStatus: {
          DRAFT: payrolls.filter(p => p.status === 'DRAFT').length,
          DIPROSES: payrolls.filter(p => p.status === 'DIPROSES').length,
          SELESAI: payrolls.filter(p => p.status === 'SELESAI').length,
          GAGAL: payrolls.filter(p => p.status === 'GAGAL').length
        },
        details: payrolls.map(p => ({
          id: p.id,
          guru: p.guru.nama,
          periode: p.periode,
          totalGaji: p.totalGaji,
          status: p.status
        }))
      };

      return summary;
    } catch (error) {
      logger.error('Error getting payroll summary:', error);
      throw error;
    }
  }
}

module.exports = new PayrollService();