const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, handlePrismaError } = require('../../lib/http/error.handler.http');
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
            const { startDate, endDate, type } = filters;

            // Build where clause
            const where = {
                type: type
            };

            // Add date filter based on user requirement
            if (startDate) {
                if (endDate) {
                    // If both startDate and endDate provided, search in date range
                    where.tanggal = {
                        gte: moment(startDate, 'DD-MM-YYYY').format('DD-MM-YYYY'),
                        lte: moment(endDate, 'DD-MM-YYYY').format('DD-MM-YYYY')
                    };
                } else {
                    // If only startDate provided, search exactly on that date
                    where.tanggal = moment(startDate, 'DD-MM-YYYY').format('DD-MM-YYYY');
                }
            }

            // Get filtered records
            const financeRecords = await prisma.finance.findMany({
                where,
                orderBy: {
                    tanggal: 'desc'
                }
            });

            // Calculate totals for filtered data
            const totals = await this.calculateTotals(startDate, endDate);

            // Format response
            const dataTable = financeRecords.map(record => ({
                id: record.id,
                tanggal: record.tanggal,
                deskripsi: record.deskripsi,
                type: record.type,
                category: record.category,
                total: Number(record.total),
                evidence: record.evidence
            }));

            return {
                income: totals.income,
                expense: totals.expense,
                revenue: totals.revenue,
                dataTable
            };
        } catch (error) {
            logger.error('Error getting finance records:', error);
            throw handlePrismaError(error);
        }
    }

    async calculateTotals(startDate, endDate) {
        try {
            // Build date filter based on user requirement
            const where = {};

            if (startDate) {
                if (endDate) {
                    // If both startDate and endDate provided, search in date range
                    where.tanggal = {
                        gte: moment(startDate, 'DD-MM-YYYY').format('DD-MM-YYYY'),
                        lte: moment(endDate, 'DD-MM-YYYY').format('DD-MM-YYYY')
                    };
                } else {
                    // If only startDate provided, search exactly on that date
                    where.tanggal = moment(startDate, 'DD-MM-YYYY').format('DD-MM-YYYY');
                }
            }

            // Calculate income total
            const incomeResult = await prisma.finance.aggregate({
                where: {
                    ...where,
                    type: 'INCOME'
                },
                _sum: {
                    total: true
                }
            });

            // Calculate expense total
            const expenseResult = await prisma.finance.aggregate({
                where: {
                    ...where,
                    type: 'EXPENSE'
                },
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

    // Auto-sync methods untuk payment gateway integration
    async createFromSppPayment(pembayaranData) {
        try {
            const { id, jumlahTagihan, tanggalPembayaran } = pembayaranData;

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

            const financeRecord = await prisma.finance.create({
                data: {
                    tanggal: tanggalPembayaran,
                    deskripsi: `Pembayaran SPP (Auto) - Payment ID: ${id}`,
                    type: 'INCOME',
                    category: 'SPP',
                    total: jumlahTagihan,
                    evidence: null
                }
            });

            logger.info(`Auto-created finance record for SPP payment ID: ${id}, Amount: ${jumlahTagihan}`);
            return financeRecord;
        } catch (error) {
            logger.error(`Error creating finance record from SPP payment:`, error);
            throw error;
        }
    }

    async createFromEnrollmentPayment(pembayaranData) {
        try {
            const { id, jumlahTagihan, tanggalPembayaran } = pembayaranData;

            // Check if finance record already exists for this payment
            const existingRecord = await prisma.finance.findFirst({
                where: {
                    deskripsi: { contains: `Enrollment Payment ID: ${id}` }
                }
            });

            if (existingRecord) {
                logger.info(`Finance record already exists for enrollment payment ID: ${id}`);
                return existingRecord;
            }

            const financeRecord = await prisma.finance.create({
                data: {
                    tanggal: tanggalPembayaran,
                    deskripsi: `Pembayaran Pendaftaran (Auto) - Payment ID: ${id}`,
                    type: 'INCOME',
                    category: 'ENROLLMENT',
                    total: jumlahTagihan,
                    evidence: null
                }
            });

            logger.info(`Auto-created finance record for enrollment payment ID: ${id}, Amount: ${jumlahTagihan}`);
            return financeRecord;
        } catch (error) {
            logger.error(`Error creating finance record from enrollment payment:`, error);
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