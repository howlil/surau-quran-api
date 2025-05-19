
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const XenditUtils = require('../../lib/utils/xendit.utils');

class SiswaService {
  async registerSiswa(data) {
    try {
      const {
        email,
        password,
        siswaData,
        programId,
        biayaPendaftaran,
        kodeVoucher,
        successRedirectUrl,
        failureRedirectUrl
      } = data;

      return await PrismaUtils.transaction(async (tx) => {
        // Check if email already exists
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw new ConflictError(`User dengan email ${email} sudah ada`);
        }

        // Validate program exists
        const program = await tx.program.findUnique({
          where: { id: programId }
        });

        if (!program) {
          throw new NotFoundError(`Program dengan ID ${programId} tidak ditemukan`);
        }

        // Hash password and create user
        const hashedPassword = await PasswordUtils.hash(password);
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: 'SISWA'
          }
        });

        // Create siswa
        const siswa = await tx.siswa.create({
          data: {
            ...siswaData,
            userId: user.id,
            isRegistered: true
          }
        });

        // Create program siswa
        const programSiswa = await tx.programSiswa.create({
          data: {
            siswaId: siswa.id,
            programId,
            status: 'AKTIF'
          }
        });

        // Calculate discount if voucher provided
        let voucher = null;
        let diskon = 0;
        let totalBiaya = biayaPendaftaran;

        if (kodeVoucher) {
          voucher = await tx.voucher.findUnique({
            where: { kodeVoucher },
            include: {
              _count: {
                select: {
                  pendaftaran: true,
                  periodeSpp: true
                }
              }
            }
          });

          if (!voucher) {
            throw new NotFoundError(`Voucher dengan kode ${kodeVoucher} tidak ditemukan`);
          }

          if (!voucher.isActive) {
            throw new BadRequestError('Voucher tidak aktif');
          }

          const totalUsage = voucher._count.pendaftaran + voucher._count.periodeSpp;
          if (totalUsage >= voucher.jumlahPenggunaan) {
            throw new BadRequestError('Voucher sudah habis digunakan');
          }

          // Calculate discount
          if (voucher.tipe === 'PERSENTASE') {
            diskon = (biayaPendaftaran * voucher.nominal) / 100;
          } else {
            diskon = voucher.nominal;
          }

          totalBiaya = Math.max(0, biayaPendaftaran - diskon);
        }

        // Create payment record
        const pembayaran = await tx.pembayaran.create({
          data: {
            tipePembayaran: 'PENDAFTARAN',
            metodePembayaran: 'VIRTUAL_ACCOUNT',
            jumlahTagihan: totalBiaya,
            statusPembayaran: 'PENDING',
            tanggalPembayaran: new Date().toISOString().split('T')[0]
          }
        });

        // Create pendaftaran
        const pendaftaran = await tx.pendaftaran.create({
          data: {
            siswaId: siswa.id,
            programSiswaId: programSiswa.id,
            pembayaranId: pembayaran.id,
            biayaPendaftaran,
            tanggalDaftar: new Date().toISOString().split('T')[0],
            voucherId: voucher?.id || null,
            diskon,
            totalBiaya,
            statusVerifikasi: 'MENUNGGU'
          }
        });

        // Create Xendit invoice
        const externalId = XenditUtils.generateExternalId('REG');
        const xenditInvoice = await XenditUtils.createInvoice({
          externalId,
          amount: totalBiaya,
          payerEmail: email,
          description: `Pendaftaran ${siswa.namaMurid} - Program ${program.namaProgram}`,
          successRedirectUrl: successRedirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
          failureRedirectUrl: failureRedirectUrl || `${process.env.FRONTEND_URL}/payment/failure`
        });

        // Create Xendit payment record
        const xenditPayment = await tx.xenditPayment.create({
          data: {
            pembayaranId: pembayaran.id,
            xenditInvoiceId: xenditInvoice.id,
            xenditExternalId: externalId,
            xenditPaymentUrl: xenditInvoice.invoice_url,
            xenditPaymentChannel: xenditInvoice.payment_method || 'MULTIPLE',
            xenditExpireDate: xenditInvoice.expiry_date,
            xenditStatus: 'PENDING'
          }
        });

        logger.info(`Registered siswa with ID: ${siswa.id}, Payment URL: ${xenditInvoice.invoice_url}`);

        return {
          siswa: {
            id: siswa.id,
            ...siswaData,
            user: {
              id: user.id,
              email: user.email,
              role: user.role
            }
          },
          program: {
            id: program.id,
            namaProgram: program.namaProgram
          },
          pendaftaran: {
            id: pendaftaran.id,
            biayaPendaftaran,
            diskon,
            totalBiaya,
            voucher: voucher ? {
              kodeVoucher: voucher.kodeVoucher,
              tipe: voucher.tipe,
              nominal: voucher.nominal
            } : null
          },
          payment: {
            id: pembayaran.id,
            amount: totalBiaya,
            status: 'PENDING',
            paymentUrl: xenditInvoice.invoice_url,
            externalId,
            expiredAt: xenditInvoice.expiry_date
          }
        };
      });
    } catch (error) {
      logger.error('Error registering siswa:', error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const siswa = await prisma.siswa.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          programSiswa: {
            include: {
              program: true,
              jadwalSiswa: {
                include: {
                  kelasProgram: {
                    include: {
                      kelas: true,
                      program: true,
                      jamMengajar: true,
                      guru: true
                    }
                  }
                }
              }
            }
          },
          pendaftaran: {
            include: {
              pembayaran: {
                include: {
                  xenditPayment: true
                }
              },
              voucher: true
            }
          }
        }
      });

      if (!siswa) {
        throw new NotFoundError(`Siswa dengan ID ${id} tidak ditemukan`);
      }

      return siswa;
    } catch (error) {
      logger.error(`Error getting siswa with ID ${id}:`, error);
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const { page = 1, limit = 10, namaMurid, isRegistered, strataPendidikan, jenisKelamin } = filters;
      
      const where = {};
      if (namaMurid) {
        where.namaMurid = { contains: namaMurid, mode: 'insensitive' };
      }
      if (isRegistered !== undefined) {
        where.isRegistered = isRegistered === 'true';
      }
      if (strataPendidikan) {
        where.strataPendidikan = strataPendidikan;
      }
      if (jenisKelamin) {
        where.jenisKelamin = jenisKelamin;
      }

      return await PrismaUtils.paginate(prisma.siswa, {
        page,
        limit,
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          programSiswa: {
            include: {
              program: true
            }
          }
        },
        orderBy: { namaMurid: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting all siswa:', error);
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const siswa = await prisma.siswa.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          programSiswa: {
            include: {
              program: true,
              jadwalSiswa: {
                include: {
                  kelasProgram: {
                    include: {
                      kelas: true,
                      program: true,
                      jamMengajar: true,
                      guru: true
                    }
                  }
                }
              },
              periodeSpp: {
                include: {
                  pembayaran: {
                    include: {
                      xenditPayment: true
                    }
                  }
                },
                orderBy: {
                  tahun: 'desc'
                }
              }
            }
          },
          pendaftaran: {
            include: {
              pembayaran: {
                include: {
                  xenditPayment: true
                }
              },
              voucher: true
            }
          }
        }
      });

      if (!siswa) {
        throw new NotFoundError('Profil siswa tidak ditemukan');
      }

      return siswa;
    } catch (error) {
      logger.error(`Error getting siswa profile for user ${userId}:`, error);
      throw error;
    }
  }

  async updateProfile(userId, data) {
    try {
      const siswa = await prisma.siswa.findUnique({
        where: { userId }
      });

      if (!siswa) {
        throw new NotFoundError('Profil siswa tidak ditemukan');
      }

      const { email, ...siswaData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        if (email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email,
              id: { not: userId }
            }
          });

          if (existingUser) {
            throw new ConflictError(`Email ${email} sudah digunakan`);
          }

          await tx.user.update({
            where: { id: userId },
            data: { email }
          });
        }

        const updated = await tx.siswa.update({
          where: { userId },
          data: siswaData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });

        logger.info(`Updated siswa profile for user: ${userId}`);
        return updated;
      });
    } catch (error) {
      logger.error(`Error updating siswa profile for user ${userId}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const siswa = await prisma.siswa.findUnique({
        where: { id },
        include: {
          programSiswa: {
            include: {
              jadwalSiswa: true,
              periodeSpp: true
            }
          },
          pendaftaran: true
        }
      });

      if (!siswa) {
        throw new NotFoundError(`Siswa dengan ID ${id} tidak ditemukan`);
      }

      const hasActivePrograms = siswa.programSiswa.some(ps => ps.status === 'AKTIF');
      const hasSchedules = siswa.programSiswa.some(ps => ps.jadwalSiswa.length > 0);
      const hasSppPayments = siswa.programSiswa.some(ps => ps.periodeSpp.length > 0);

      if (hasActivePrograms || hasSchedules || hasSppPayments) {
        throw new ConflictError('Siswa memiliki program aktif atau data pembayaran dan tidak dapat dihapus');
      }

      await PrismaUtils.transaction(async (tx) => {
        await tx.siswa.delete({
          where: { id }
        });

        await tx.user.delete({
          where: { id: siswa.userId }
        });
      });

      logger.info(`Deleted siswa with ID: ${id}`);
      return { id };
    } catch (error) {
      logger.error(`Error deleting siswa with ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new SiswaService();