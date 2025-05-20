const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, BadRequestError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const XenditUtils = require('../../lib/utils/xendit.utils');

class PaymentService {
  async getPaymentById(id) {
    try {
      const payment = await prisma.pembayaran.findUnique({
        where: { id },
        include: {
          xenditPayment: true,
          pendaftaran: {
            include: {
              siswa: {
                select: {
                  namaMurid: true,
                  user: {
                    select: {
                      email: true
                    }
                  }
                }
              },
              programSiswa: {
                include: {
                  program: true
                }
              }
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: {
                    select: {
                      namaMurid: true,
                      user: {
                        select: {
                          email: true
                        }
                      }
                    }
                  },
                  program: true
                }
              }
            }
          }
        }
      });

      if (!payment) {
        throw new NotFoundError(`Pembayaran dengan ID ${id} tidak ditemukan`);
      }

      return payment;
    } catch (error) {
      logger.error(`Error getting payment with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllPayments(filters = {}) {
    try {
      const { page = 1, limit = 10, tipePembayaran, statusPembayaran, metodePembayaran } = filters;

      const where = {};
      if (tipePembayaran) {
        where.tipePembayaran = tipePembayaran;
      }
      if (statusPembayaran) {
        where.statusPembayaran = statusPembayaran;
      }
      if (metodePembayaran) {
        where.metodePembayaran = metodePembayaran;
      }

      return await PrismaUtils.paginate(prisma.pembayaran, {
        page,
        limit,
        where,
        include: {
          xenditPayment: true,
          pendaftaran: {
            include: {
              siswa: {
                select: {
                  namaMurid: true
                }
              }
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: {
                    select: {
                      namaMurid: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting all payments:', error);
      throw error;
    }
  }

  async verifyPayment(id) {
    try {
      const payment = await this.getPaymentById(id);

      if (!payment.xenditPayment) {
        throw new BadRequestError('Pembayaran ini tidak memiliki integrasi Xendit');
      }

      if (payment.statusPembayaran === 'LUNAS') {
        throw new ConflictError('Pembayaran sudah diverifikasi');
      }

      const xenditInvoice = await XenditUtils.getInvoice(payment.xenditPayment.xenditInvoiceId);

      if (xenditInvoice.status !== 'PAID' && xenditInvoice.status !== 'SETTLED') {
        throw new BadRequestError(`Pembayaran belum dilakukan di Xendit. Status: ${xenditInvoice.status}`);
      }

      return await PrismaUtils.transaction(async (tx) => {
        // Update payment status
        const updatedPayment = await tx.pembayaran.update({
          where: { id },
          data: {
            statusPembayaran: 'LUNAS',
            xenditPayment: {
              update: {
                xenditStatus: xenditInvoice.status,
                xenditPaidAt: xenditInvoice.paid_at || new Date().toISOString()
              }
            }
          }
        });

        // If pendaftaran payment, update pendaftaran status
        if (payment.pendaftaran) {
          await tx.pendaftaran.update({
            where: { id: payment.pendaftaran.id },
            data: {
              statusVerifikasi: 'DIVERIFIKASI'
            }
          });
        }

        // If SPP payment, update SPP period status
        if (payment.periodeSpp) {
          await tx.periodeSpp.update({
            where: { id: payment.periodeSpp.id },
            data: {
              statusPembayaran: 'LUNAS'
            }
          });
        }

        logger.info(`Verified payment with ID: ${id}`);
        return updatedPayment;
      });
    } catch (error) {
      logger.error(`Error verifying payment with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process callback data from Xendit invoice webhook
   * @param {Object} callbackData - Raw callback data from Xendit
   * @returns {Object} Processed payment data
   */
  processInvoiceCallback(callbackData) {
    try {
      // Extract essential callback data
      const {
        id: xenditInvoiceId,
        external_id: externalId,
        status,
        paid_at: paidAt,
        payment_method: paymentMethod,
        amount
      } = callbackData;

      if (!xenditInvoiceId) {
        throw new BadRequestError('Callback data tidak memiliki ID invoice');
      }

      return {
        xenditInvoiceId,
        externalId,
        status,
        paidAt,
        paymentMethod,
        amount
      };
    } catch (error) {
      logger.error('Error processing invoice callback:', error);
      throw error;
    }
  }

  /**
   * Handle callback webhook from Xendit for invoice payments
   * @param {Object} callbackData - Raw callback data from Xendit
   * @returns {Object} Updated payment data
   */
  async handleInvoiceCallback(callbackData) {
    try {
      // Process the callback data to extract relevant information
      const processedData = this.processInvoiceCallback(callbackData);

      // Find the XenditPayment record using the invoice ID from the processed data
      let xenditPayment = await prisma.xenditPayment.findUnique({
        where: {
          xenditInvoiceId: processedData.xenditInvoiceId
        },
        include: {
          pembayaran: {
            include: {
              pendaftaran: true,
              periodeSpp: true
            }
          }
        }
      });

      // If not found, try to look up by externalId as a fallback
      if (!xenditPayment && processedData.externalId) {
        logger.info(`Xendit payment with invoice ID ${processedData.xenditInvoiceId} not found, trying to find by externalId ${processedData.externalId}`);

        xenditPayment = await prisma.xenditPayment.findFirst({
          where: {
            xenditExternalId: processedData.externalId
          },
          include: {
            pembayaran: {
              include: {
                pendaftaran: true,
                periodeSpp: true
              }
            }
          }
        });

        // If found by externalId, update the xenditInvoiceId to match what Xendit sent
        if (xenditPayment) {
          logger.info(`Found payment by externalId ${processedData.externalId}, updating xenditInvoiceId`);
          await prisma.xenditPayment.update({
            where: { id: xenditPayment.id },
            data: { xenditInvoiceId: processedData.xenditInvoiceId }
          });
        }
      }

      if (!xenditPayment) {
        // Log the callback data for debugging
        logger.error('Xendit payment not found for callback:', JSON.stringify({
          invoiceId: processedData.xenditInvoiceId,
          externalId: processedData.externalId,
          callbackData: callbackData
        }));

        // Store the callback data anyway for later processing
        await prisma.xenditCallbackInvoice.create({
          data: {
            // Use a placeholder xenditPaymentId since we can't find the actual payment
            // We'll use the xenditInvoiceId as the ID so it's identifiable later
            xenditPaymentId: processedData.xenditInvoiceId,
            eventType: 'INVOICE_STATUS_UPDATED_UNMATCHED',
            amount: processedData.amount,
            status: processedData.status,
            rawResponse: callbackData
          }
        });

        throw new NotFoundError(`Xendit payment dengan invoice ID ${processedData.xenditInvoiceId} tidak ditemukan`);
      }

      // Map Xendit status to application status
      const paymentStatus = XenditUtils.mapXenditStatus(processedData.status);

      // Store callback data
      await prisma.xenditCallbackInvoice.create({
        data: {
          xenditPaymentId: xenditPayment.id,
          eventType: 'INVOICE_STATUS_UPDATED',
          amount: processedData.amount,
          status: processedData.status,
          rawResponse: callbackData
        }
      });

      // Update payment status based on the callback
      return await PrismaUtils.transaction(async (tx) => {
        // Update XenditPayment
        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt
          }
        });

        // Update main payment record
        const updatedPayment = await tx.pembayaran.update({
          where: { id: xenditPayment.pembayaranId },
          data: {
            statusPembayaran: paymentStatus
          }
        });

        // If payment is successful, update related records
        if (paymentStatus === 'LUNAS') {
          // Handle registration payment if it's a new registration without pendaftaran record
          if (xenditPayment.pembayaran.tipePembayaran === 'PENDAFTARAN' && !xenditPayment.pembayaran.pendaftaran) {
            // This is likely a pre-registration payment
            // Import siswaService here to avoid circular dependency
            const siswaService = require('./siswa.service');
            const registrationResult = await siswaService.completeRegistrationFromCallback({
              invoiceId: processedData.xenditInvoiceId,
              status: processedData.status,
              paidAt: processedData.paidAt
            });

            logger.info('Completed student registration from payment callback', {
              pembayaranId: xenditPayment.pembayaranId,
              registrationCompleted: !!registrationResult
            });
          }

          // Update pendaftaran if it exists (for existing/manual registrations)
          if (xenditPayment.pembayaran.pendaftaran) {
            await tx.pendaftaran.update({
              where: { id: xenditPayment.pembayaran.pendaftaran.id },
              data: {
                statusVerifikasi: 'DIVERIFIKASI'
              }
            });
          }

          // Update SPP period if it exists
          if (xenditPayment.pembayaran.periodeSpp) {
            await tx.periodeSpp.update({
              where: { id: xenditPayment.pembayaran.periodeSpp.id },
              data: {
                statusPembayaran: 'LUNAS'
              }
            });
          }
        }

        logger.info(`Processed Xendit invoice callback for payment ID: ${xenditPayment.pembayaranId}, status: ${paymentStatus}`);
        return updatedPayment;
      });
    } catch (error) {
      logger.error('Error handling invoice callback:', error);
      throw error;
    }
  }

  /**
   * Create a new payment
   * @param {Object} data - Payment data
   * @returns {Object} Created payment
   */
  async createPayment(data) {
    try {
      const { tipePembayaran, metodePembayaran, jumlahTagihan, payerEmail, description, externalId } = data;

      // Create payment record
      const payment = await prisma.pembayaran.create({
        data: {
          tipePembayaran,
          metodePembayaran,
          jumlahTagihan,
          statusPembayaran: 'PENDING',
          tanggalPembayaran: new Date().toISOString().split('T')[0]
        }
      });

      // If payment method is not cash, create Xendit invoice
      if (metodePembayaran !== 'TUNAI') {
        const invoiceExternalId = externalId || XenditUtils.generateExternalId(tipePembayaran === 'PENDAFTARAN' ? 'REG' : 'SPP');

        // Prepare invoice data with proper formatting
        const xenditInvoiceData = {
          externalId: invoiceExternalId,
          amount: Number(jumlahTagihan), // Ensure amount is a number
          payerEmail,
          description: description || `Pembayaran ${tipePembayaran}`
        };

        // Only add redirect URLs if FRONTEND_URL is set
        if (process.env.FRONTEND_URL) {
          xenditInvoiceData.successRedirectUrl = `${process.env.FRONTEND_URL}/payment/success`;
          xenditInvoiceData.failureRedirectUrl = `${process.env.FRONTEND_URL}/payment/failure`;
        }

        // Log the invoice data we're sending
        logger.debug('Creating payment invoice with data:', JSON.stringify(xenditInvoiceData, null, 2));

        const xenditInvoice = await XenditUtils.createInvoice(xenditInvoiceData);

        // Create Xendit payment record with correct field mapping
        await prisma.xenditPayment.create({
          data: {
            pembayaranId: payment.id,
            xenditInvoiceId: xenditInvoice.id,
            xenditExternalId: invoiceExternalId,
            xenditPaymentUrl: xenditInvoice.invoice_url,
            xenditPaymentChannel: xenditInvoice.payment_method || 'MULTIPLE',
            xenditExpireDate: xenditInvoice.expiry_date,
            xenditStatus: 'PENDING'
          }
        });

        // Update payment with details
        return await prisma.pembayaran.findUnique({
          where: { id: payment.id },
          include: {
            xenditPayment: true
          }
        });
      }

      return payment;
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {string} id - Payment ID
   * @param {string} status - New payment status
   * @returns {Object} Updated payment
   */
  async updatePaymentStatus(id, status) {
    try {
      const payment = await this.getPaymentById(id);

      return await PrismaUtils.transaction(async (tx) => {
        const updatedPayment = await tx.pembayaran.update({
          where: { id },
          data: {
            statusPembayaran: status
          }
        });

        // Update related records based on status
        if (status === 'LUNAS') {
          if (payment.pendaftaran) {
            await tx.pendaftaran.update({
              where: { id: payment.pendaftaran.id },
              data: {
                statusVerifikasi: 'DIVERIFIKASI'
              }
            });
          }

          if (payment.periodeSpp) {
            await tx.periodeSpp.update({
              where: { id: payment.periodeSpp.id },
              data: {
                statusPembayaran: 'LUNAS'
              }
            });
          }
        }

        logger.info(`Updated payment status for ID: ${id} to ${status}`);
        return updatedPayment;
      });
    } catch (error) {
      logger.error(`Error updating payment status for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a payment
   * @param {string} id - Payment ID
   * @returns {Object} Cancelled payment
   */
  async cancelPayment(id) {
    try {
      const payment = await this.getPaymentById(id);

      if (payment.statusPembayaran === 'LUNAS') {
        throw new ConflictError('Pembayaran yang sudah lunas tidak dapat dibatalkan');
      }

      // If Xendit payment exists, expire the invoice
      if (payment.xenditPayment) {
        await XenditUtils.expireInvoice(payment.xenditPayment.xenditInvoiceId);
      }

      return await PrismaUtils.transaction(async (tx) => {
        // Update payment status
        const updatedPayment = await tx.pembayaran.update({
          where: { id },
          data: {
            statusPembayaran: 'DIBATALKAN'
          }
        });

        // Update Xendit payment if exists
        if (payment.xenditPayment) {
          await tx.xenditPayment.update({
            where: { id: payment.xenditPayment.id },
            data: {
              xenditStatus: 'EXPIRED'
            }
          });
        }

        // Update related records
        if (payment.pendaftaran) {
          await tx.pendaftaran.update({
            where: { id: payment.pendaftaran.id },
            data: {
              statusVerifikasi: 'MENUNGGU'
            }
          });
        }

        if (payment.periodeSpp) {
          await tx.periodeSpp.update({
            where: { id: payment.periodeSpp.id },
            data: {
              statusPembayaran: 'DIBATALKAN'
            }
          });
        }

        logger.info(`Cancelled payment with ID: ${id}`);
        return updatedPayment;
      });
    } catch (error) {
      logger.error(`Error cancelling payment with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get current month's SPP payments with filtering
   * @param {Object} filters - Filter parameters
   * @returns {Object} Paginated SPP payments
   */
  async getCurrentMonthSpp(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        statusPembayaran,
        bulan,
        tahun,
        search
      } = filters;

      // Get current month and year if not provided
      const now = new Date();
      const currentMonth = bulan || now.toLocaleString('id-ID', { month: 'long' });
      const currentYear = tahun || now.getFullYear();

      // Build where clause
      const where = {
        bulan: currentMonth,
        tahun: parseInt(currentYear, 10)
      };

      if (statusPembayaran) {
        where.statusPembayaran = statusPembayaran;
      }

      // For searching by student name
      if (search) {
        where.programSiswa = {
          siswa: {
            namaMurid: {
              contains: search,
              mode: 'insensitive'
            }
          }
        };
      }

      return await PrismaUtils.paginate(prisma.periodeSpp, {
        page,
        limit,
        where,
        include: {
          programSiswa: {
            include: {
              siswa: {
                select: {
                  id: true,
                  namaMurid: true,
                  namaPanggilan: true,
                  strataPendidikan: true,
                  user: {
                    select: {
                      email: true
                    }
                  }
                }
              },
              program: true
            }
          },
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        },
        orderBy: [
          { statusPembayaran: 'asc' },
          { programSiswa: { siswa: { namaMurid: 'asc' } } }
        ]
      });
    } catch (error) {
      logger.error('Error getting current month SPP:', error);
      throw error;
    }
  }

  /**
   * Get student's SPP payments
   * @param {string} siswaId - Student ID
   * @param {Object} filters - Filter parameters
   * @returns {Object} Paginated student's SPP payments
   */
  async getStudentSpp(siswaId, filters = {}) {
    try {
      const { page = 1, limit = 10, statusPembayaran, bulan, tahun } = filters;

      // Build where clause
      const where = {
        programSiswa: {
          siswaId
        }
      };

      if (statusPembayaran) {
        where.statusPembayaran = statusPembayaran;
      }

      if (bulan) {
        where.bulan = bulan;
      }

      if (tahun) {
        where.tahun = parseInt(tahun, 10);
      }

      return await PrismaUtils.paginate(prisma.periodeSpp, {
        page,
        limit,
        where,
        include: {
          programSiswa: {
            include: {
              program: true
            }
          },
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        },
        orderBy: [
          { tahun: 'desc' },
          { bulan: 'desc' }
        ]
      });
    } catch (error) {
      logger.error(`Error getting SPP for student ID ${siswaId}:`, error);
      throw error;
    }
  }

  /**
   * Pay a single SPP
   * @param {string} periodeSppId - SPP period ID
   * @param {Object} paymentData - Payment method data
   * @returns {Object} Payment information with Xendit link
   */
  async paySpp(periodeSppId, paymentData) {
    try {
      const { metodePembayaran } = paymentData;

      // Check if the SPP exists and is not already paid
      const periodeSpp = await prisma.periodeSpp.findUnique({
        where: { id: periodeSppId },
        include: {
          programSiswa: {
            include: {
              siswa: {
                include: {
                  user: {
                    select: {
                      email: true
                    }
                  }
                }
              },
              program: true
            }
          },
          pembayaran: true
        }
      });

      if (!periodeSpp) {
        throw new NotFoundError(`Periode SPP dengan ID ${periodeSppId} tidak ditemukan`);
      }

      if (periodeSpp.statusPembayaran === 'LUNAS') {
        throw new ConflictError('SPP ini sudah dibayar');
      }

      if (periodeSpp.pembayaran && periodeSpp.pembayaran.statusPembayaran === 'PENDING') {
        // If there's a pending payment, return it
        const existingPayment = await prisma.pembayaran.findUnique({
          where: { id: periodeSpp.pembayaranId },
          include: {
            xenditPayment: true
          }
        });

        if (existingPayment?.xenditPayment) {
          return {
            payment: existingPayment,
            xenditPaymentUrl: existingPayment.xenditPayment.xenditPaymentUrl,
            message: 'Pembayaran sudah ada dan menunggu pembayaran'
          };
        }
      }

      // If we're proceeding with a new payment, create one
      return await PrismaUtils.transaction(async (tx) => {
        // If there's an existing payment in non-final state, cancel it
        if (periodeSpp.pembayaranId &&
          periodeSpp.statusPembayaran !== 'LUNAS' &&
          periodeSpp.statusPembayaran !== 'DIBATALKAN') {

          await tx.pembayaran.update({
            where: { id: periodeSpp.pembayaranId },
            data: {
              statusPembayaran: 'DIBATALKAN'
            }
          });

          // If the payment has Xendit integration, expire it
          const xenditPayment = await tx.xenditPayment.findUnique({
            where: { pembayaranId: periodeSpp.pembayaranId }
          });

          if (xenditPayment) {
            try {
              await XenditUtils.expireInvoice(xenditPayment.xenditInvoiceId);
              await tx.xenditPayment.update({
                where: { id: xenditPayment.id },
                data: {
                  xenditStatus: 'EXPIRED'
                }
              });
            } catch (error) {
              logger.error(`Failed to expire Xendit invoice: ${error.message}`);
              // Continue with the process even if expiring fails
            }
          }

          // Clear the payment reference from SPP
          await tx.periodeSpp.update({
            where: { id: periodeSppId },
            data: {
              pembayaranId: null,
              statusPembayaran: 'UNPAID'
            }
          });
        }

        // Create new payment
        const payment = await tx.pembayaran.create({
          data: {
            tipePembayaran: 'SPP',
            metodePembayaran,
            jumlahTagihan: periodeSpp.totalTagihan,
            statusPembayaran: 'PENDING',
            tanggalPembayaran: new Date().toISOString().split('T')[0]
          }
        });

        // Link payment to SPP
        await tx.periodeSpp.update({
          where: { id: periodeSppId },
          data: {
            pembayaranId: payment.id,
            statusPembayaran: 'PENDING'
          }
        });

        // If payment method is not cash, create Xendit invoice
        if (metodePembayaran !== 'TUNAI') {
          const siswa = periodeSpp.programSiswa.siswa;
          const program = periodeSpp.programSiswa.program;

          const invoiceExternalId = XenditUtils.generateExternalId('SPP');
          const description = `Pembayaran SPP ${periodeSpp.bulan} ${periodeSpp.tahun} - ${siswa.namaMurid} - ${program.namaProgram}`;

          // Prepare the invoice data with proper formatting
          const xenditInvoiceData = {
            externalId: invoiceExternalId,
            amount: Number(periodeSpp.totalTagihan), // Ensure amount is a number
            payerEmail: siswa.user.email,
            description
          };

          // Only add redirect URLs if FRONTEND_URL is set
          if (process.env.FRONTEND_URL) {
            xenditInvoiceData.successRedirectUrl = `${process.env.FRONTEND_URL}/siswa/spp/success`;
            xenditInvoiceData.failureRedirectUrl = `${process.env.FRONTEND_URL}/siswa/spp/failure`;
          }

          // Log the invoice data we're sending
          logger.debug('Creating SPP invoice with data:', JSON.stringify(xenditInvoiceData, null, 2));

          const xenditInvoice = await XenditUtils.createInvoice(xenditInvoiceData);

          // Create Xendit payment record with correct field mappings
          await tx.xenditPayment.create({
            data: {
              pembayaranId: payment.id,
              xenditInvoiceId: xenditInvoice.id,
              xenditExternalId: invoiceExternalId,
              xenditPaymentUrl: xenditInvoice.invoice_url,
              xenditPaymentChannel: xenditInvoice.payment_method || 'MULTIPLE',
              xenditExpireDate: xenditInvoice.expiry_date,
              xenditStatus: 'PENDING'
            }
          });

          const result = await tx.pembayaran.findUnique({
            where: { id: payment.id },
            include: {
              xenditPayment: true
            }
          });

          return {
            payment: result,
            xenditPaymentUrl: xenditInvoice.invoice_url,
            message: 'Pembayaran SPP berhasil dibuat'
          };
        }

        // For cash payments, return the payment info
        return {
          payment,
          message: 'Pembayaran SPP berhasil dibuat dan menunggu verifikasi admin'
        };
      });
    } catch (error) {
      logger.error(`Error paying SPP with ID ${periodeSppId}:`, error);
      throw error;
    }
  }

  /**
   * Pay multiple SPP periods at once
   * @param {Array} periodeSppIds - Array of SPP period IDs
   * @param {Object} paymentData - Payment method data
   * @returns {Object} Payment information with Xendit link
   */
  async batchPaySpp(periodeSppIds, paymentData) {
    try {
      const { metodePembayaran } = paymentData;

      if (!periodeSppIds || !Array.isArray(periodeSppIds) || periodeSppIds.length === 0) {
        throw new BadRequestError('Daftar SPP yang akan dibayar tidak valid');
      }

      // Get all SPP periods at once
      const periodeSppList = await prisma.periodeSpp.findMany({
        where: {
          id: { in: periodeSppIds },
          // Only get unpaid or pending SPP
          statusPembayaran: { in: ['UNPAID', 'PENDING'] }
        },
        include: {
          programSiswa: {
            include: {
              siswa: {
                include: {
                  user: {
                    select: {
                      email: true
                    }
                  }
                }
              },
              program: true
            }
          },
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        }
      });

      if (periodeSppList.length === 0) {
        throw new NotFoundError('Tidak ada SPP yang valid untuk dibayar secara batch');
      }

      // Verify all SPP periods belong to the same student
      const siswaId = periodeSppList[0].programSiswa.siswaId;
      const allSameSiswa = periodeSppList.every(spp => spp.programSiswa.siswaId === siswaId);

      if (!allSameSiswa) {
        throw new BadRequestError('Batch payment hanya dapat dilakukan untuk SPP siswa yang sama');
      }

      // Calculate total amount
      const totalAmount = periodeSppList.reduce((sum, spp) => sum + Number(spp.totalTagihan), 0);

      // Get student information for the payment description
      const siswa = periodeSppList[0].programSiswa.siswa;

      return await PrismaUtils.transaction(async (tx) => {
        // Create a single payment for all SPP periods
        const batchPayment = await tx.pembayaran.create({
          data: {
            tipePembayaran: 'SPP',
            metodePembayaran,
            jumlahTagihan: totalAmount,
            statusPembayaran: 'PENDING',
            tanggalPembayaran: new Date().toISOString().split('T')[0]
          }
        });

        // Create tracking records for each SPP period
        for (const spp of periodeSppList) {
          // If there's an existing payment, cancel it
          if (spp.pembayaranId) {
            await tx.pembayaran.update({
              where: { id: spp.pembayaranId },
              data: {
                statusPembayaran: 'DIBATALKAN'
              }
            });

            // If the payment has Xendit integration, expire it
            if (spp.pembayaran?.xenditPayment) {
              try {
                await XenditUtils.expireInvoice(spp.pembayaran.xenditPayment.xenditInvoiceId);
                await tx.xenditPayment.update({
                  where: { id: spp.pembayaran.xenditPayment.id },
                  data: {
                    xenditStatus: 'EXPIRED'
                  }
                });
              } catch (error) {
                logger.error(`Failed to expire Xendit invoice: ${error.message}`);
                // Continue with the process even if expiring fails
              }
            }
          }

          // Update the SPP period to link it to the new batch payment
          await tx.periodeSpp.update({
            where: { id: spp.id },
            data: {
              pembayaranId: batchPayment.id,
              statusPembayaran: 'PENDING'
            }
          });
        }

        // If payment method is not cash, create Xendit invoice
        if (metodePembayaran !== 'TUNAI') {
          const periods = periodeSppList.map(spp => `${spp.bulan} ${spp.tahun}`).join(', ');
          const invoiceExternalId = XenditUtils.generateExternalId('BATCH_SPP');
          const description = `Pembayaran Batch SPP untuk ${siswa.namaMurid}: ${periods}`;

          // Prepare the invoice data with proper formatting
          const xenditInvoiceData = {
            externalId: invoiceExternalId,
            amount: Number(totalAmount), // Ensure amount is a number
            payerEmail: siswa.user.email,
            description
          };

          // Only add redirect URLs if FRONTEND_URL is set
          if (process.env.FRONTEND_URL) {
            xenditInvoiceData.successRedirectUrl = `${process.env.FRONTEND_URL}/siswa/spp/success`;
            xenditInvoiceData.failureRedirectUrl = `${process.env.FRONTEND_URL}/siswa/spp/failure`;
          }

          // Log the invoice data we're sending
          logger.debug('Creating batch SPP invoice with data:', JSON.stringify(xenditInvoiceData, null, 2));

          const xenditInvoice = await XenditUtils.createInvoice(xenditInvoiceData);

          // Create Xendit payment record
          await tx.xenditPayment.create({
            data: {
              pembayaranId: batchPayment.id,
              xenditInvoiceId: xenditInvoice.id,
              xenditExternalId: invoiceExternalId,
              xenditPaymentUrl: xenditInvoice.invoice_url,
              xenditPaymentChannel: xenditInvoice.payment_method || 'MULTIPLE',
              xenditExpireDate: xenditInvoice.expiry_date,
              xenditStatus: 'PENDING'
            }
          });

          const result = await tx.pembayaran.findUnique({
            where: { id: batchPayment.id },
            include: {
              xenditPayment: true
            }
          });

          return {
            payment: result,
            periodeSppCount: periodeSppList.length,
            totalAmount,
            xenditPaymentUrl: xenditInvoice.invoice_url,
            message: 'Pembayaran batch SPP berhasil dibuat'
          };
        }

        // For cash payments, return the payment info
        return {
          payment: batchPayment,
          periodeSppCount: periodeSppList.length,
          totalAmount,
          message: 'Pembayaran batch SPP berhasil dibuat dan menunggu verifikasi admin'
        };
      });
    } catch (error) {
      logger.error('Error creating batch SPP payment:', error);
      throw error;
    }
  }

  // Helper method to generate external ID
  generateExternalId(prefix) {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}`;
  }
}

module.exports = new PaymentService();