const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
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

            return finance;
        } catch (error) {
            throw error
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
                evidence: record.evidence,
                metodePembayaran: record.metodePembayaran,
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
            throw error
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
            throw error
        }
    }


    async update(id, data) {
        try {
            // Check if finance record exists
            const finance = await prisma.finance.findUnique({
                where: { id }
            });

            if (!finance) {
                throw ErrorFactory.notFound(`Finance record dengan ID ${id} tidak ditemukan`);
            }

            const updated = await prisma.finance.update({
                where: { id },
                data
            });

            return updated;
        } catch (error) {
            if (error.statusCode) throw error;
            throw error
        }
    }

    async delete(id) {
        try {
            // Check if finance record exists
            const finance = await prisma.finance.findUnique({
                where: { id }
            });

            if (!finance) {
                throw ErrorFactory.notFound(`Finance record dengan ID ${id} tidak ditemukan`);
            }

            await prisma.finance.delete({
                where: { id }
            });

            return { id };
        } catch (error) {
            if (error.statusCode) throw error;
            throw error
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

            return financeRecord;
        } catch (error) {
            throw error
        }
    }

    async createFromEnrollmentPayment(pembayaranData) {
        try {
            const { id, jumlahTagihan, tanggalPembayaran, metodePembayaran } = pembayaranData;

            // Check if finance record already exists for this payment
            const existingRecord = await prisma.finance.findFirst({
                where: {
                    deskripsi: { contains: `Enrollment Payment ID: ${id}` }
                }
            });

            if (existingRecord) {
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

            return financeRecord;
        } catch (error) {
            throw error
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
                return existingRecord;
            }

            const tanggalProses = moment().format('DD-MM-YYYY');

            const financeRecord = await prisma.finance.create({
                data: {
                    tanggal: tanggalProses,
                    deskripsi: `Gaji Guru ${guru.nama} (Auto) - ${bulan}/${tahun} - Payroll ID: ${id}`,
                    metodePembayaran: 'BANK_TRANSFER', // Payroll biasanya via bank transfer
                    type: 'EXPENSE',
                    category: 'PAYROLL_SALARY',
                    total: totalGaji,
                    evidence: null
                }
            });

            return financeRecord;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new FinanceService(); 