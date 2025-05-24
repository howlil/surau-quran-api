const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const XenditUtils = require('../../lib/utils/xendit.utils');

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

  async deletePayroll(id) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          payrollDisbursement: true
        }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      if (payroll.status === 'SELESAI') {
        throw new BadRequestError('Payroll yang sudah selesai tidak dapat dihapus');
      }

      if (payroll.payrollDisbursement) {
        throw new ConflictError('Payroll yang sudah memiliki disbursement tidak dapat dihapus');
      }

      await prisma.payroll.delete({
        where: { id }
      });

      logger.info(`Deleted payroll with ID: ${id}`);
      return { id };
    } catch (error) {
      logger.error(`Error deleting payroll with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllPayrolls(filters = {}) {
    try {
      const { page = 1, limit = 10, periode, status, guruId } = filters;

      const where = {};

      if (periode) {
        where.periode = { contains: periode, mode: 'insensitive' };
      }

      if (status) {
        where.status = status;
      }

      if (guruId) {
        where.guruId = guruId;
      }

      return await PrismaUtils.paginate(prisma.payroll, {
        page,
        limit,
        where,
        include: {
          guru: {
            select: {
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true
            }
          },
          payrollDisbursement: {
            select: {
              id: true,
              tanggalProses: true,
              xenditDisbursement: {
                select: {
                  xenditStatus: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting all payrolls:', error);
      throw error;
    }
  }

  async getPayrollById(id) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          guru: {
            select: {
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true,
              tarifPerJam: true
            }
          },
          payrollDisbursement: {
            include: {
              xenditDisbursement: true
            }
          },
          absensiGuru: {
            select: {
              tanggal: true,
              jamMasuk: true,
              jamKeluar: true,
              sks: true,
              statusKehadiran: true
            },
            orderBy: { tanggal: 'asc' }
          }
        }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      return payroll;
    } catch (error) {
      logger.error(`Error getting payroll with ID ${id}:`, error);
      throw error;
    }
  }

  async processPayroll(id) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          guru: true,
          payrollDisbursement: true
        }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      if (payroll.status !== 'DIPROSES') {
        throw new BadRequestError('Hanya payroll dengan status DIPROSES yang dapat diproses');
      }

      if (payroll.payrollDisbursement) {
        throw new ConflictError('Payroll sudah memiliki disbursement');
      }

      if (!payroll.guru.noRekening || !payroll.guru.namaBank) {
        throw new BadRequestError('Data rekening guru belum lengkap');
      }

      return await PrismaUtils.transaction(async (tx) => {
        const disbursement = await tx.payrollDisbursement.create({
          data: {
            payrollId: id,
            amount: payroll.totalGaji,
            tanggalProses: new Date().toISOString().split('T')[0]
          }
        });

        try {
          const xenditDisbursement = await XenditUtils.createDisbursement({
            externalId: XenditUtils.generateExternalId('PAYROLL'),
            amount: Number(payroll.totalGaji),
            bankCode: this.#getBankCode(payroll.guru.namaBank),
            accountHolderName: payroll.guru.nama,
            accountNumber: payroll.guru.noRekening,
            description: `Gaji ${payroll.periode} - ${payroll.guru.nama}`
          });

          await tx.xenditDisbursement.create({
            data: {
              payrollDisbursementId: disbursement.id,
              xenditDisbursementId: xenditDisbursement.id,
              xenditExternalId: xenditDisbursement.external_id,
              xenditAmount: Number(xenditDisbursement.amount),
              xenditStatus: 'PENDING',
              xenditCreatedAt: xenditDisbursement.created_at,
              rawResponse: xenditDisbursement
            }
          });

          await tx.payroll.update({
            where: { id },
            data: { status: 'SELESAI' }
          });

          logger.info(`Successfully processed payroll disbursement for ID: ${id}`);

          return {
            payrollId: id,
            disbursementId: disbursement.id,
            xenditDisbursementId: xenditDisbursement.id,
            amount: payroll.totalGaji,
            status: 'SELESAI'
          };
        } catch (xenditError) {
          logger.error('Failed to create Xendit disbursement:', xenditError);
          
          await tx.payroll.update({
            where: { id },
            data: { status: 'GAGAL' }
          });

          throw new BadRequestError(`Gagal memproses disbursement: ${xenditError.message}`);
        }
      });
    } catch (error) {
      logger.error(`Error processing payroll with ID ${id}:`, error);
      throw error;
    }
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
                tahun
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
                tahun
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

          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `${tahun}-${bulan.toString().padStart(2, '0')}`
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
            tahun,
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

  async disburseBatch(data) {
    try {
      const { payrollIds } = data;

      const payrolls = await prisma.payroll.findMany({
        where: {
          id: { in: payrollIds },
          status: 'DIPROSES'
        },
        include: {
          guru: true,
          payrollDisbursement: true
        }
      });

      if (payrolls.length === 0) {
        throw new BadRequestError('Tidak ada payroll yang dapat diproses');
      }

      const results = [];
      const errors = [];

      for (const payroll of payrolls) {
        try {
          const result = await this.processPayroll(payroll.id);
          results.push(result);
        } catch (error) {
          errors.push({
            payrollId: payroll.id,
            guru: payroll.guru.nama,
            error: error.message
          });
        }
      }

      logger.info(`Batch processed ${results.length} payrolls`);

      return {
        success: results,
        errors,
        summary: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          totalAmount: results.reduce((sum, r) => sum + Number(r.amount), 0)
        }
      };
    } catch (error) {
      logger.error('Error processing batch disbursement:', error);
      throw error;
    }
  }

  #getBankCode(namaBank) {
    const bankCodes = {
      'BCA': 'BCA',
      'MANDIRI': 'MANDIRI',
      'BNI': 'BNI',
      'BRI': 'BRI',
      'CIMB': 'CIMB',
      'DANAMON': 'DANAMON',
      'PERMATA': 'PERMATA',
      'BSI': 'BSI',
      'BTN': 'BTN'
    };

    const bankName = namaBank?.toUpperCase();
    return bankCodes[bankName] || 'BCA';
  }
}

module.exports = new PayrollService();