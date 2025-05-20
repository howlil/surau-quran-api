const { logger } = require('../../lib/config/logger.config');
const payrollFactory = require('../factories/payroll.factory');
const payrollDisbursementFactory = require('../factories/payroll-disbursement.factory');
const xenditDisbursementFactory = require('../factories/xendit-disbursement.factory');
const xenditCallbackDisbursementFactory = require('../factories/xendit-callback-disbursement.factory');
const { faker } = require('@faker-js/faker');

class PayrollSeeder {
    static async seed({ gurus, absensiGurus }) {
        try {
            logger.info('Seeding payroll and disbursements...');

            const payrolls = [];
            const payrollDisbursements = [];
            const xenditDisbursements = [];
            const xenditCallbacks = [];

            // Group attendance by guru
            const guruAttendance = {};
            absensiGurus.forEach(attendance => {
                const kelasProgram = attendance.kelasProgramId;
                const guru = gurus.find(g => g.id === kelasProgram?.guruId);

                if (guru) {
                    if (!guruAttendance[guru.id]) {
                        guruAttendance[guru.id] = [];
                    }
                    guruAttendance[guru.id].push(attendance);
                }
            });

            // Create payroll records for each guru who has attendance records
            for (const [guruId, attendances] of Object.entries(guruAttendance)) {
                const guru = gurus.find(g => g.id === guruId);
                if (!guru) continue;

                // Calculate salary based on attendance
                const tarifPerJam = parseFloat(guru.tarifPerJam);

                // Create payroll for the current month
                const bulan = faker.date.month();
                const tahun = 2024;

                // Calculate total hours taught (SKS)
                const totalSKS = attendances.reduce((sum, a) => sum + a.sks, 0);

                // Calculate base salary based on hours taught
                const gajiPokok = tarifPerJam * totalSKS;

                // Random incentives and deductions
                const insentif = faker.datatype.boolean(0.7) ? parseFloat(faker.finance.amount(50000, 200000, 0)) : 0;
                const potongan = faker.datatype.boolean(0.3) ? parseFloat(faker.finance.amount(10000, 50000, 0)) : 0;

                const totalGaji = gajiPokok + insentif - potongan;

                // Create payroll record
                const payroll = await payrollFactory.with({
                    guruId,
                    periode: `${bulan} ${tahun}`,
                    bulan,
                    tahun,
                    gajiPokok,
                    insentif,
                    potongan,
                    totalGaji,
                    status: faker.helpers.arrayElement(['DRAFT', 'DIPROSES', 'SELESAI'])
                }).createOne();

                payrolls.push(payroll);

                // Update attendance records with payroll ID
                // This would be done in a real implementation but we're skipping here for simplicity

                // Create disbursement for completed payrolls (60% chance)
                if (payroll.status === 'SELESAI' || faker.datatype.boolean(0.6)) {
                    // Create payroll disbursement
                    const payrollDisbursement = await payrollDisbursementFactory.with({
                        payrollId: payroll.id,
                        amount: totalGaji,
                        tanggalProses: faker.date.recent(5).toISOString().split('T')[0]
                    }).createOne();

                    payrollDisbursements.push(payrollDisbursement);

                    // Create Xendit disbursement
                    const xenditStatus = faker.helpers.arrayElement(['PENDING', 'COMPLETED', 'FAILED']);

                    const xenditDisbursement = await xenditDisbursementFactory.with({
                        payrollDisbursementId: payrollDisbursement.id,
                        xenditDisbursementId: `xnd_dsb_${faker.string.alphanumeric(16)}`,
                        xenditExternalId: `PAYROLL-${faker.string.alphanumeric(10)}`,
                        xenditAmount: totalGaji,
                        xenditStatus,
                        xenditCreatedAt: faker.date.recent(10).toISOString(),
                        xenditUpdatedAt: xenditStatus !== 'PENDING' ? faker.date.recent(2).toISOString() : null
                    }).createOne();

                    xenditDisbursements.push(xenditDisbursement);

                    // Create callback record for some disbursements (70% chance)
                    if (faker.datatype.boolean(0.7)) {
                        const eventType = `disbursement.${xenditStatus.toLowerCase()}`;

                        const xenditCallback = await xenditCallbackDisbursementFactory.with({
                            xenditDisbursementId: xenditDisbursement.id,
                            eventType,
                            amount: totalGaji,
                            status: xenditStatus
                        }).createOne();

                        xenditCallbacks.push(xenditCallback);
                    }
                }
            }

            logger.info(`Created ${payrolls.length} payroll records, ${payrollDisbursements.length} disbursement records, ${xenditDisbursements.length} Xendit disbursement records, and ${xenditCallbacks.length} Xendit callback records`);
            p
            return {
                payrolls,
                payrollDisbursements,
                xenditDisbursements,
                xenditCallbacks
            };
        } catch (error) {
            logger.error('Error seeding payroll and disbursements:', error);
            throw error;
        }
    }
}

module.exports = PayrollSeeder;