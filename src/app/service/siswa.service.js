
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');

class SiswaService {
  async preRegisterSiswa(data) {
    try {
      const {
        email,
        siswaData,
        programId,
        kelasProgramId,
        jadwalPreferences,
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

        // Validate kelas program if provided
        let kelasProgram = null;
        if (kelasProgramId) {
          kelasProgram = await tx.kelasProgram.findUnique({
            where: { id: kelasProgramId },
            include: {
              kelas: true,
              jamMengajar: true,
              guru: true
            }
          });

          if (!kelasProgram) {
            throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
          }
        }

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

        // Create pending registration record (temporary)
        const tempRegistration = await tx.$executeRaw`
          INSERT INTO temp_registration (
            email, siswa_data, program_id, kelas_program_id, 
            jadwal_preferences, biaya_pendaftaran, voucher_id, 
            diskon, total_biaya, success_redirect_url, failure_redirect_url
          ) VALUES (
            ${email}, ${JSON.stringify(siswaData)}, ${programId}, 
            ${kelasProgramId}, ${JSON.stringify(jadwalPreferences)}, 
            ${biayaPendaftaran}, ${voucher?.id}, ${diskon}, ${totalBiaya},
            ${successRedirectUrl}, ${failureRedirectUrl}
          )
        `;

        const tempId = tempRegistration.insertId;

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

        // Create Xendit invoice
        const externalId = paymentService.generateExternalId('REG');
        const xenditInvoice = await paymentService.createInvoice({
          externalId,
          amount: totalBiaya,
          payerEmail: email,
          description: `Pendaftaran ${siswaData.namaMurid} - Program ${program.namaProgram}`,
          successRedirectUrl: successRedirectUrl || `${process.env.FRONTEND_URL}/payment/success?temp_id=${tempId}`,
          failureRedirectUrl: failureRedirectUrl || `${process.env.FRONTEND_URL}/payment/failure?temp_id=${tempId}`
        });

        // Create Xendit payment record with temp_id reference
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

        // Store temp_id in xendit payment for callback reference
        await tx.$executeRaw`
          UPDATE xendit_payment SET temp_registration_id = ${tempId} 
          WHERE id = ${xenditPayment.id}
        `;

        logger.info(`Created pre-registration for ${email}, Payment URL: ${xenditInvoice.invoice_url}`);

        return {
          tempRegistrationId: tempId,
          program: {
            id: program.id,
            namaProgram: program.namaProgram
          },
          kelasProgram: kelasProgram ? {
            id: kelasProgram.id,
            kelas: kelasProgram.kelas?.namaKelas,
            hari: kelasProgram.hari,
            jamMengajar: `${kelasProgram.jamMengajar.jamMulai} - ${kelasProgram.jamMengajar.jamSelesai}`
          } : null,
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
      });
    } catch (error) {
      logger.error('Error pre-registering siswa:', error);
      throw error;
    }
  }

  async completeRegistrationFromCallback(callbackData) {
    try {
      return await PrismaUtils.transaction(async (tx) => {
        // Get xendit payment and temp registration
        const xenditPayment = await tx.xenditPayment.findUnique({
          where: { xenditInvoiceId: callbackData.invoiceId },
          include: {
            pembayaran: true
          }
        });

        if (!xenditPayment) {
          throw new NotFoundError('Xendit payment not found');
        }

        // Get temp registration data
        const tempRegResult = await tx.$queryRaw`
          SELECT * FROM temp_registration WHERE id = ${xenditPayment.temp_registration_id}
        `;

        if (!tempRegResult || tempRegResult.length === 0) {
          throw new NotFoundError('Temporary registration not found');
        }

        const tempReg = tempRegResult[0];
        const siswaData = JSON.parse(tempReg.siswa_data);
        const jadwalPreferences = JSON.parse(tempReg.jadwal_preferences);

        // Generate default password
        const defaultPassword = this.generateDefaultPassword();
        const hashedPassword = await PasswordUtils.hash(defaultPassword);

        // Create user
        const user = await tx.user.create({
          data: {
            email: tempReg.email,
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
            programId: tempReg.program_id,
            status: 'AKTIF'
          }
        });

        // Create pendaftaran
        const pendaftaran = await tx.pendaftaran.create({
          data: {
            siswaId: siswa.id,
            programSiswaId: programSiswa.id,
            pembayaranId: xenditPayment.pembayaranId,
            biayaPendaftaran: tempReg.biaya_pendaftaran,
            tanggalDaftar: new Date().toISOString().split('T')[0],
            voucherId: tempReg.voucher_id,
            diskon: tempReg.diskon,
            totalBiaya: tempReg.total_biaya,
            statusVerifikasi: 'DIVERIFIKASI'
          }
        });

        // If specific kelas program chosen, create jadwal siswa
        if (tempReg.kelas_program_id) {
          await tx.jadwalSiswa.create({
            data: {
              programSiswaId: programSiswa.id,
              kelasProgramId: tempReg.kelas_program_id
            }
          });
        }

        // Create pendaftaran jadwal from preferences
        if (jadwalPreferences && jadwalPreferences.length > 0) {
          for (const preference of jadwalPreferences) {
            await tx.pendaftaranJadwal.create({
              data: {
                pendaftaranId: pendaftaran.id,
                hari: preference.hari,
                jamMengajarId: preference.jamMengajarId,
              }
            });
          }
        }

        // Clean up temp registration
        await tx.$executeRaw`
          DELETE FROM temp_registration WHERE id = ${tempReg.id}
        `;

        logger.info(`Completed registration for siswa ID: ${siswa.id}`);

        return {
          siswa: {
            id: siswa.id,
            ...siswaData,
            user: {
              id: user.id,
              email: user.email,
              role: user.role
            },
            defaultPassword: defaultPassword
          },
          programSiswa: {
            id: programSiswa.id,
            status: programSiswa.status
          },
          pendaftaran: {
            id: pendaftaran.id,
            statusVerifikasi: pendaftaran.statusVerifikasi
          }
        };
      });
    } catch (error) {
      logger.error('Error completing registration from callback:', error);
      throw error;
    }
  }

  generateDefaultPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async getRegistrationStatus(tempId) {
    try {
      const tempRegResult = await prisma.$queryRaw`
        SELECT tr.*, p.status_pembayaran, xp.xendit_status, xp.xendit_payment_url
        FROM temp_registration tr
        LEFT JOIN xendit_payment xp ON xp.temp_registration_id = tr.id
        LEFT JOIN pembayaran p ON p.id = xp.pembayaran_id
        WHERE tr.id = ${tempId}
      `;

      if (!tempRegResult || tempRegResult.length === 0) {
        throw new NotFoundError('Registration not found');
      }

      const tempReg = tempRegResult[0];

      return {
        tempRegistrationId: tempReg.id,
        email: tempReg.email,
        siswaData: JSON.parse(tempReg.siswa_data),
        paymentStatus: tempReg.status_pembayaran,
        xenditStatus: tempReg.xendit_status,
        paymentUrl: tempReg.xendit_payment_url,
        totalBiaya: tempReg.total_biaya,
        isCompleted: false
      };
    } catch (error) {
      logger.error(`Error getting registration status ${tempId}:`, error);
      throw error;
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
}

module.exports = new SiswaService();