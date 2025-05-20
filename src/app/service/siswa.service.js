const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const XenditUtils = require('../../lib/utils/xendit.utils');

class SiswaService {
  constructor() {
    // Initialize memory storage for temp registrations
    this.tempStorage = new Map();
  }

  /**
   * Pre-register a student without creating user/siswa records immediately
   * Only creates payment and stores registration data temporarily
   * @param {Object} data - Registration data
   */
  async preRegisterSiswa(data) {
    try {
      const {
        email,
        siswaData,
        programId,
        jadwalPreferences,
        biayaPendaftaran,
        kodeVoucher,
        successRedirectUrl,
        failureRedirectUrl
      } = data;

      // Validate email is not registered
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new ConflictError(`Email ${email} sudah terdaftar`);
      }

      // Validate program exists
      const program = await prisma.program.findUnique({
        where: { id: programId },
      });

      if (!program) {
        throw new NotFoundError(`Program dengan ID ${programId} tidak ditemukan`);
      }

      // Validate schedule preferences
      if (jadwalPreferences && jadwalPreferences.length > 0) {
        for (const pref of jadwalPreferences) {
          const jamMengajar = await prisma.jamMengajar.findUnique({
            where: { id: pref.jamMengajarId }
          });

          if (!jamMengajar) {
            throw new NotFoundError(`Jam mengajar dengan ID ${pref.jamMengajarId} tidak ditemukan`);
          }
        }
      }

      // Check voucher if provided
      let voucher = null;
      let diskon = 0;

      if (kodeVoucher) {
        voucher = await prisma.voucher.findUnique({
          where: { kodeVoucher }
        });

        if (!voucher) {
          throw new NotFoundError(`Voucher dengan kode ${kodeVoucher} tidak ditemukan`);
        }

        if (!voucher.isActive) {
          throw new BadRequestError(`Voucher dengan kode ${kodeVoucher} sudah tidak aktif`);
        }

        // Calculate discount
        if (voucher.tipe === 'PERSENTASE') {
          diskon = (voucher.nominal * biayaPendaftaran) / 100;
        } else {
          diskon = Number(voucher.nominal);
        }
      }

      // Calculate total cost
      const totalBiaya = biayaPendaftaran - diskon;

      // Generate a unique external ID
      const externalId = this.generateExternalId('REG');

      // Create payment record in database first (will be updated with Xendit info later)
      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'VIRTUAL_ACCOUNT', // Default method
          jumlahTagihan: totalBiaya,
          statusPembayaran: 'PENDING',
          tanggalPembayaran: new Date().toISOString().split('T')[0]
        }
      });

      try {
        // Create payment record via Xendit with properly formatted data
        const xenditInvoiceData = {
          externalId,
          amount: Number(totalBiaya), // Ensure amount is a number
          payerEmail: email,
          description: `Pendaftaran Siswa - ${siswaData.namaMurid} - ${program.namaProgram}`,
        };

        // Only add redirect URLs if provided
        if (successRedirectUrl) {
          xenditInvoiceData.successRedirectUrl = successRedirectUrl;
        } else if (process.env.FRONTEND_URL) {
          xenditInvoiceData.successRedirectUrl = `${process.env.FRONTEND_URL}/register/success`;
        }

        if (failureRedirectUrl) {
          xenditInvoiceData.failureRedirectUrl = failureRedirectUrl;
        } else if (process.env.FRONTEND_URL) {
          xenditInvoiceData.failureRedirectUrl = `${process.env.FRONTEND_URL}/register/failure`;
        }

        // Log the data we're sending to XenditUtils
        logger.debug('Creating invoice with data:', JSON.stringify(xenditInvoiceData, null, 2));

        const xenditInvoice = await XenditUtils.createInvoice(xenditInvoiceData);

        // Create Xendit payment record
        await prisma.xenditPayment.create({
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

        // Store registration data in memory
        this.tempStorage.set(pembayaran.id, {
          email,
          siswaData,
          programId,
          jadwalPreferences,
          biayaPendaftaran,
          diskon,
          totalBiaya,
          voucherId: voucher?.id,
          isTemporary: true,
          createdAt: new Date()
        });

        logger.info(`Created temporary registration with payment ID: ${pembayaran.id}`);

        // Return response
        return {
          tempRegistrationId: pembayaran.id,
          program: {
            id: program.id,
            namaProgram: program.namaProgram
          },
          jadwalPreferences: jadwalPreferences.map(pref => ({
            hari: pref.hari,
            jamMengajarId: pref.jamMengajarId
          })),
          pendaftaran: {
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
      } catch (xenditError) {
        // If Xendit invoice creation fails, delete the pembayaran record
        await prisma.pembayaran.delete({
          where: { id: pembayaran.id }
        });

        logger.error('Error creating Xendit invoice:', xenditError);
        throw new BadRequestError(`Gagal membuat invoice pembayaran: ${xenditError.message}`);
      }
    } catch (error) {
      logger.error('Error pre-registering siswa:', error);
      throw error;
    }
  }

  /**
   * Complete registration from Xendit callback
   * @param {Object} callbackData - Xendit callback data
   */
  async completeRegistrationFromCallback(callbackData) {
    try {
      return await PrismaUtils.transaction(async (tx) => {
        // Get xendit payment
        const xenditPayment = await tx.xenditPayment.findUnique({
          where: { xenditInvoiceId: callbackData.invoiceId },
          include: {
            pembayaran: true
          }
        });

        if (!xenditPayment) {
          throw new NotFoundError('Xendit payment not found');
        }

        // Get temp registration data from memory
        const tempData = this.tempStorage.get(xenditPayment.pembayaranId);
        if (!tempData || !tempData.isTemporary) {
          return null;
        }

        const { siswaData, programId, jadwalPreferences, voucherId } = tempData;

        const defaultPassword = this.generateDefaultPassword();
        const hashedPassword = await PasswordUtils.hash(defaultPassword);

        // Create user
        const user = await tx.user.create({
          data: {
            email: tempData.email,
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
            programId: programId,
            status: 'AKTIF'
          }
        });

        // Create pendaftaran
        const pendaftaran = await tx.pendaftaran.create({
          data: {
            siswaId: siswa.id,
            programSiswaId: programSiswa.id,
            pembayaranId: xenditPayment.pembayaranId,
            biayaPendaftaran: tempData.biayaPendaftaran,
            tanggalDaftar: new Date().toISOString().split('T')[0],
            voucherId: voucherId,
            diskon: tempData.diskon,
            totalBiaya: tempData.totalBiaya,
            statusVerifikasi: 'DIVERIFIKASI'
          }
        });

        // Create pendaftaran jadwal from preferences
        if (jadwalPreferences && jadwalPreferences.length > 0) {
          for (const preference of jadwalPreferences) {
            await tx.pendaftaranJadwal.create({
              data: {
                pendaftaranId: pendaftaran.id,
                hari: preference.hari,
                jamMengajarId: preference.jamMengajarId
              }
            });
          }
        }

        // Clean up temp registration from memory
        this.tempStorage.delete(xenditPayment.pembayaranId);

        logger.info(`Completed registration for siswa ID: ${siswa.id}`);

        // Return user email and default password for admin's reference
        return {
          userId: user.id,
          siswaId: siswa.id,
          email: tempData.email,
          defaultPassword: defaultPassword
        };
      });
    } catch (error) {
      logger.error('Error completing registration from callback:', error);
      throw error;
    }
  }

  /**
   * Generate default password for new accounts
   * Format: @Siswa + random 4 digit number
   */
  generateDefaultPassword() {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `@Siswa${randomDigits}`;
  }

  /**
   * Generate unique external ID for payments
   */
  generateExternalId(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}`;
  }

  async getRegistrationStatus(tempId) {
    try {
      const tempData = this.tempStorage.get(tempId);

      if (!tempData) {
        throw new NotFoundError('Registration not found');
      }

      // Get payment status from pembayaran table
      const pembayaran = await prisma.pembayaran.findUnique({
        where: { id: tempId },
        include: {
          xenditPayment: true
        }
      });

      if (!pembayaran) {
        throw new NotFoundError('Payment not found');
      }

      return {
        tempRegistrationId: tempId,
        email: tempData.email,
        siswaData: tempData.siswaData,
        paymentStatus: pembayaran.statusPembayaran,
        xenditStatus: pembayaran.xenditPayment?.xenditStatus,
        paymentUrl: pembayaran.xenditPayment?.xenditPaymentUrl,
        totalBiaya: tempData.totalBiaya,
        isCompleted: !tempData.isTemporary
      };
    } catch (error) {
      logger.error(`Error getting registration status ${tempId}:`, error);
      throw error;
    }
  }

  async simulatePaymentCallback(tempId) {
    try {
      // For development/testing - simulate successful payment
      const tempData = this.tempStorage.get(tempId);
      if (!tempData) {
        throw new NotFoundError('Registration not found');
      }

      const pembayaran = await prisma.pembayaran.findUnique({
        where: { id: tempId },
        include: {
          xenditPayment: true
        }
      });

      if (!pembayaran?.xenditPayment) {
        throw new NotFoundError('Payment not found');
      }

      // Update payment status
      await prisma.$transaction(async (tx) => {
        await tx.pembayaran.update({
          where: { id: tempId },
          data: { statusPembayaran: 'PAID' }
        });

        await tx.xenditPayment.update({
          where: { id: pembayaran.xenditPayment.id },
          data: {
            xenditStatus: 'PAID',
            xenditPaidAt: new Date().toISOString()
          }
        });
      });

      // Complete registration
      const result = await this.completeRegistrationFromCallback({
        invoiceId: pembayaran.xenditPayment.xenditInvoiceId,
        status: 'PAID'
      });

      logger.info(`Simulated payment completion for temp ID: ${tempId}`);
      return result;
    } catch (error) {
      logger.error(`Error simulating payment callback ${tempId}:`, error);
      throw error;
    }
  }

  async cleanupExpiredRegistrations() {
    try {
      const now = new Date();
      const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours

      let cleanedCount = 0;
      for (const [id, data] of this.tempStorage.entries()) {
        const createdAt = new Date(data.createdAt);
        if (now - createdAt > expiredThreshold) {
          this.tempStorage.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired registrations`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired registrations:', error);
    }
  }

  async registerSiswa(data) {
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

    return await this.preRegisterSiswa({
      email,
      siswaData,
      programId,
      kelasProgramId: null,
      jadwalPreferences: [],
      biayaPendaftaran,
      kodeVoucher,
      successRedirectUrl,
      failureRedirectUrl
    });
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

  // Enhanced getAll method with more detailed information and filtering by program
  async getAllDetailed(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        programId,
        strataPendidikan,
        jenisKelamin,
        status
      } = filters;

      // Build where clause for siswa
      const where = {};

      // Search by name
      if (search) {
        where.OR = [
          { namaMurid: { contains: search, mode: 'insensitive' } },
          { namaPanggilan: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (strataPendidikan) {
        where.strataPendidikan = strataPendidikan;
      }

      if (jenisKelamin) {
        where.jenisKelamin = jenisKelamin;
      }

      // Include program filters for ProgramSiswa
      const programSiswaWhere = {};
      if (programId) {
        programSiswaWhere.programId = programId;
      }

      if (status) {
        programSiswaWhere.status = status;
      }

      const include = {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        programSiswa: {
          where: Object.keys(programSiswaWhere).length > 0 ? programSiswaWhere : undefined,
          include: {
            program: true,
            jadwalSiswa: {
              include: {
                kelasProgram: {
                  include: {
                    kelas: true,
                    program: true,
                    jamMengajar: true
                  }
                }
              }
            }
          }
        }
      };

      // Check if we need to filter by programId
      if (programId) {
        where.programSiswa = {
          some: {
            programId
          }
        };
      }

      // Check if we need to filter by status
      if (status) {
        where.programSiswa = {
          ...where.programSiswa,
          some: {
            ...(where.programSiswa?.some || {}),
            status
          }
        };
      }

      return await PrismaUtils.paginate(prisma.siswa, {
        page,
        limit,
        where,
        include,
        orderBy: { namaMurid: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting detailed siswa data:', error);
      throw error;
    }
  }

  // Get complete student details including pendaftaran and pendaftaran jadwal
  async getDetailedById(id) {
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
                      guru: {
                        select: {
                          id: true,
                          nama: true,
                          nip: true
                        }
                      }
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
              voucher: true,
              PendaftaranJadwal: {
                include: {
                  jamMengajar: true
                }
              },
              programSiswa: {
                include: {
                  program: true
                }
              }
            }
          }
        }
      });

      if (!siswa) {
        throw new NotFoundError(`Siswa dengan ID ${id} tidak ditemukan`);
      }

      return siswa;
    } catch (error) {
      logger.error(`Error getting detailed siswa with ID ${id}:`, error);
      throw error;
    }
  }

  // Update student details including pendaftaran and pendaftaran jadwal
  async updateDetailedSiswa(id, data) {
    try {
      const siswa = await prisma.siswa.findUnique({
        where: { id },
        include: {
          user: true,
          pendaftaran: true
        }
      });

      if (!siswa) {
        throw new NotFoundError(`Siswa dengan ID ${id} tidak ditemukan`);
      }

      const {
        email,
        siswaData,
        pendaftaranData,
        pendaftaranJadwalData
      } = data;

      return await PrismaUtils.transaction(async (tx) => {
        // Update email if provided
        if (email && email !== siswa.user.email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email,
              id: { not: siswa.userId }
            }
          });

          if (existingUser) {
            throw new ConflictError(`Email ${email} sudah digunakan`);
          }

          await tx.user.update({
            where: { id: siswa.userId },
            data: { email }
          });
        }

        // Update siswa data if provided
        let updatedSiswa = siswa;
        if (siswaData) {
          updatedSiswa = await tx.siswa.update({
            where: { id },
            data: siswaData
          });
        }

        // Update pendaftaran data if provided
        let updatedPendaftaran = null;
        if (pendaftaranData && siswa.pendaftaran.length > 0) {
          // Update each pendaftaran
          for (const pendaftaran of siswa.pendaftaran) {
            updatedPendaftaran = await tx.pendaftaran.update({
              where: { id: pendaftaran.id },
              data: pendaftaranData
            });
          }
        }

        // Update pendaftaranJadwal data if provided
        let updatedPendaftaranJadwal = [];
        if (pendaftaranJadwalData && pendaftaranJadwalData.length > 0 && siswa.pendaftaran.length > 0) {
          for (const jadwalItem of pendaftaranJadwalData) {
            const { id: jadwalId, ...jadwalData } = jadwalItem;
            if (jadwalId) {
              // Update existing jadwal
              const updated = await tx.pendaftaranJadwal.update({
                where: { id: jadwalId },
                data: jadwalData
              });
              updatedPendaftaranJadwal.push(updated);
            } else if (jadwalData.pendaftaranId) {
              // Create new jadwal
              const created = await tx.pendaftaranJadwal.create({
                data: jadwalData
              });
              updatedPendaftaranJadwal.push(created);
            }
          }
        }

        logger.info(`Updated siswa with ID: ${id}`);

        // Get the updated full record
        const updatedRecord = await tx.siswa.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            },
            pendaftaran: {
              include: {
                PendaftaranJadwal: true
              }
            }
          }
        });

        return updatedRecord;
      });
    } catch (error) {
      logger.error(`Error updating siswa details for ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new SiswaService();