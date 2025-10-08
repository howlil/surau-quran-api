const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, handlePrismaError } = require('../../lib/http/error.handler.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');

class FinanceService {
    async create(data) {
        try {
            const finance = await prisma.finance.create({
                data: {
                    tanggal: data.tanggal,
                    deskripsi: data.deskripsi,
                    type: data.type,
                    category: data.category,
                    total: data.total,
                    evidence: data.evidence
                }
            });

            logger.info(`Created finance record with ID: ${finance.id}`);
            return finance;
        } catch (error) {
            logger.error('Error creating finance record:', error);
            throw handlePrismaError(error);
        }
    }

     async getAll(filters = {}) {
        try {
            const { startDate, endDate, type, page = 1, limit = 10 } = filters;

            // Build where clause for database query
            const where = {};

            // Add type filter only if provided
            if (type) {
                where.type = type;
            }

            let filteredData = [];
            let totalRecords = 0;

            if (startDate) {
                if (endDate) {
                    // Filter rentang tanggal: startDate sampai endDate
                    const startDateFormatted = moment(startDate, 'DD-MM-YYYY').format('YYYY-MM-DD');
                    const endDateFormatted = moment(endDate, 'DD-MM-YYYY').format('YYYY-MM-DD');

                    // Get all records untuk filter manual
                    const allRecords = await prisma.finance.findMany({
                        where: type ? { type: type } : {},
                        orderBy: { tanggal: 'desc' }
                    });

                    // Filter records by date range
                    filteredData = allRecords.filter(record => {
                        const recordDateFormatted = moment(record.tanggal, 'DD-MM-YYYY').format('YYYY-MM-DD');
                        return recordDateFormatted >= startDateFormatted && recordDateFormatted <= endDateFormatted;
                    });

                    totalRecords = filteredData.length;

                    // Apply pagination manually
                    const startIndex = (page - 1) * limit;
                    const endIndex = startIndex + parseInt(limit);
                    filteredData = filteredData.slice(startIndex, endIndex);
                } else {
                    // Filter tanggal exact: hanya pada startDate
                    where.tanggal = startDate;

                    // Use PrismaUtils.paginate for exact date
                    const result = await PrismaUtils.paginate(prisma.finance, {
                        page,
                        limit,
                        where,
                        orderBy: { tanggal: 'desc' }
                    });

                    filteredData = result.data;
                    totalRecords = result.pagination.total;
                }
            } else {
                // No date filter, use normal pagination
                const result = await PrismaUtils.paginate(prisma.finance, {
                    page,
                    limit,
                    where,
                    orderBy: { tanggal: 'desc' }
                });

                filteredData = result.data;
                totalRecords = result.pagination.total;
            }

            // Calculate totals for filtered data
            const totals = await this.calculateTotals(startDate, endDate);

            // Format response
            const dataTable = filteredData.map(record => ({
                id: record.id,
                tanggal: record.tanggal,
                deskripsi: record.deskripsi,
                type: record.type,
                category: record.category,
                total: Number(record.total),
                evidence: record.evidence
            }));

            // Calculate pagination info
            const totalPages = Math.ceil(totalRecords / limit);

            return {
                income: totals.income,
                expense: totals.expense,
                revenue: totals.revenue,
                dataTable,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalRecords,
                    totalPages
                }
            };
        } catch (error) {
            logger.error('Error getting finance records:', error);
            throw handlePrismaError(error);
        }
    }

    async calculateTotals(startDate, endDate) {
        try {
            if (startDate && endDate) {
                // Convert DD-MM-YYYY to YYYY-MM-DD for proper date comparison
                const startDateFormatted = moment(startDate, 'DD-MM-YYYY').format('YYYY-MM-DD');
                const endDateFormatted = moment(endDate, 'DD-MM-YYYY').format('YYYY-MM-DD');

                // Get all records and filter them manually
                const allIncomeRecords = await prisma.finance.findMany({
                    where: { type: 'INCOME' }
                });

                const allExpenseRecords = await prisma.finance.findMany({
                    where: { type: 'EXPENSE' }
                });

                // Filter records by date range
                const filteredIncomeRecords = allIncomeRecords.filter(record => {
                    const recordDateFormatted = moment(record.tanggal, 'DD-MM-YYYY').format('YYYY-MM-DD');
                    return recordDateFormatted >= startDateFormatted && recordDateFormatted <= endDateFormatted;
                });

                const filteredExpenseRecords = allExpenseRecords.filter(record => {
                    const recordDateFormatted = moment(record.tanggal, 'DD-MM-YYYY').format('YYYY-MM-DD');
                    return recordDateFormatted >= startDateFormatted && recordDateFormatted <= endDateFormatted;
                });

                // Calculate totals manually
                const income = filteredIncomeRecords.reduce((sum, record) => sum + Number(record.total), 0);
                const expense = filteredExpenseRecords.reduce((sum, record) => sum + Number(record.total), 0);
                const revenue = income - expense;

                return {
                    income,
                    expense,
                    revenue
                };
            } else {
                // For exact date or no date filter, use aggregate
                let whereIncome = { type: 'INCOME' };
                let whereExpense = { type: 'EXPENSE' };

                if (startDate) {
                    // If only startDate provided, search exactly on that date
                    whereIncome.tanggal = startDate;
                    whereExpense.tanggal = startDate;
                }

                // Calculate income total
                const incomeResult = await prisma.finance.aggregate({
                    where: whereIncome,
                    _sum: {
                        total: true
                    }
                });

                // Calculate expense total
                const expenseResult = await prisma.finance.aggregate({
                    where: whereExpense,
                    _sum: {
                        total: true
                    }
                });

                const income = Number(incomeResult._sum.total || 0);
                const expense = Number(expenseResult._sum.total || 0);
                const revenue = income - expense;

                return {
                    income,
                    expense,
                    revenue
                };
            }
        } catch (error) {
            logger.error('Error calculating finance totals:', error);
            throw handlePrismaError(error);
        }
    }


    async update(id, data) {
        try {
            // Check if finance record exists
            const finance = await prisma.finance.findUnique({
                where: { id }
            });

            if (!finance) {
                throw new NotFoundError(`Finance record dengan ID ${id} tidak ditemukan`);
            }

            const updated = await prisma.finance.update({
                where: { id },
                data
            });

            logger.info(`Updated finance record with ID: ${id}`);
            return updated;
        } catch (error) {
            logger.error(`Error updating finance record with ID ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Check if finance record exists
            const finance = await prisma.finance.findUnique({
                where: { id }
            });

            if (!finance) {
                throw new NotFoundError(`Finance record dengan ID ${id} tidak ditemukan`);
            }

            await prisma.finance.delete({
                where: { id }
            });

            logger.info(`Deleted finance record with ID: ${id}`);
            return { id };
        } catch (error) {
            logger.error(`Error deleting finance record with ID ${id}:`, error);
            throw error;
        }
    }

    async createFromSppPayment(pembayaranData) {
        try {
            const { id, jumlahTagihan, tanggalPembayaran, metodePembayaran } = pembayaranData;

            // Check if finance record already exists for this payment
            const existingRecord = await prisma.finance.findFirst({
                where: {
                    deskripsi: { contains: `SPP Payment ID: ${id}` }
                }
            });

            if (existingRecord) {
                logger.info(`Finance record already exists for SPP payment ID: ${id}`);
                return existingRecord;
            }

            // Deskripsi yang berbeda berdasarkan metode pembayaran
            const metodeText = metodePembayaran === 'TUNAI' ? 'Tunai' : 'Payment Gateway';
            const deskripsi = `Pembayaran SPP ${metodeText} (Auto) - Payment ID: ${id}`;

            const financeRecord = await prisma.finance.create({
                data: {
                    tanggal: tanggalPembayaran,
                    deskripsi: deskripsi,
                    metodePembayaran: metodePembayaran || 'PAYMENT_GATEWAY',
                    type: 'INCOME',
                    category: 'SPP',
                    total: jumlahTagihan,
                    evidence: null
                }
            });

            logger.info(`Auto-created finance record for SPP payment ID: ${id}, Amount: ${jumlahTagihan}, Method: ${metodePembayaran || 'PAYMENT_GATEWAY'}`);
            return financeRecord;
        } catch (error) {
            logger.error(`Error creating finance record from SPP payment:`, error);
            throw error;
        }
    }

    async createFromEnrollmentPayment(pembayaranData) {
        try {
            logger.info('Creating finance record from enrollment payment:', pembayaranData);
            const { id, jumlahTagihan, tanggalPembayaran, metodePembayaran } = pembayaranData;

            // Check if finance record already exists for this payment
            const existingRecord = await prisma.finance.findFirst({
                where: {
                    deskripsi: { contains: `Enrollment Payment ID: ${id}` }
                }
            });

            if (existingRecord) {
                logger.info(`Finance record already exists for enrollment payment ID: ${id}`, {
                    financeRecordId: existingRecord.id,
                    amount: existingRecord.total
                });
                return existingRecord;
            }

            // Tentukan deskripsi berdasarkan metode pembayaran
            const metodeText = metodePembayaran === 'TUNAI' ? 'Tunai' : 'Payment Gateway';
            const deskripsi = `Pembayaran Pendaftaran ${metodeText} (Auto) - Payment ID: ${id}`;

            const financeRecord = await prisma.finance.create({
                data: {
                    tanggal: tanggalPembayaran,
                    deskripsi: deskripsi,
                    metodePembayaran: metodePembayaran || 'PAYMENT_GATEWAY', // Default untuk backward compatibility
                    type: 'INCOME',
                    category: 'ENROLLMENT',
                    total: jumlahTagihan,
                    evidence: null
                }
            });

            logger.info(`Successfully auto-created finance record for enrollment payment:`, {
                paymentId: id,
                financeRecordId: financeRecord.id,
                amount: Number(jumlahTagihan),
                date: tanggalPembayaran,
                metodePembayaran: metodePembayaran
            });
            return financeRecord;
        } catch (error) {
            logger.error(`Error creating finance record from enrollment payment:`, {
                paymentData: pembayaranData,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async createFromPayrollDisbursement(payrollData) {
        try {
            const { id, totalGaji, bulan, tahun, guru } = payrollData;

            // Check if finance record already exists for this payroll
            const existingRecord = await prisma.finance.findFirst({
                where: {
                    deskripsi: { contains: `Payroll ID: ${id}` }
                }
            });

            if (existingRecord) {
                logger.info(`Finance record already exists for payroll ID: ${id}`);
                return existingRecord;
            }

            const tanggalProses = moment().format('DD-MM-YYYY');

            const financeRecord = await prisma.finance.create({
                data: {
                    tanggal: tanggalProses,
                    deskripsi: `Gaji Guru ${guru.nama} (Auto) - ${bulan}/${tahun} - Payroll ID: ${id}`,
                    type: 'EXPENSE',
                    category: 'PAYROLL_SALARY',
                    total: totalGaji,
                    evidence: null
                }
            });

            logger.info(`Auto-created finance record for payroll ID: ${id}, Guru: ${guru.nama}, Amount: ${totalGaji}`);
            return financeRecord;
        } catch (error) {
            logger.error(`Error creating finance record from payroll disbursement:`, error);
            throw error;
        }
    }
}

module.exports = new FinanceService(); 