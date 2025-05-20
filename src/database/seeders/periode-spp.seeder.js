const { logger } = require('../../lib/config/logger.config');
const periodeSppFactory = require('../factories/periode-spp.factory');
const pembayaranFactory = require('../factories/pembayaran.factory');
const { faker } = require('@faker-js/faker');

class PeriodeSppSeeder {
    static async seed({ programSiswas, vouchers }) {
        try {
            logger.info('Seeding periode SPP...');

            const periodeSpp = [];
            const pembayarans = [];

            // Only create SPP periods for active program-siswa entries
            const activePrograms = programSiswas.filter(ps => ps.status === 'AKTIF');

            // Create 1-3 SPP periods for each active program-siswa
            for (const programSiswa of activePrograms) {
                const numPeriods = faker.number.int({ min: 1, max: 3 });

                // Generate months for the periods
                const months = faker.helpers.arrayElements(
                    ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
                    numPeriods
                );

                const year = 2024; // Current year

                for (const month of months) {
                    // Determine if a voucher will be used (10% chance)
                    const useVoucher = faker.datatype.boolean(0.1);
                    let voucher = null;
                    let diskon = 0;

                    const jumlahTagihan = parseFloat(faker.finance.amount(100000, 300000, 0));

                    if (useVoucher && vouchers.length > 0) {
                        voucher = faker.helpers.arrayElement(vouchers);

                        if (voucher.tipe === 'PERSENTASE') {
                            diskon = (jumlahTagihan * voucher.nominal) / 100;
                        } else {
                            diskon = parseFloat(voucher.nominal);
                        }
                    }

                    const totalTagihan = jumlahTagihan - diskon;

                    // Create payment for this SPP period
                    const statusPembayaran = faker.helpers.arrayElement(['PENDING', 'PAID', 'SETTLED', 'EXPIRED']);

                    // Create payment record if needed
                    let pembayaran = null;
                    if (statusPembayaran !== 'EXPIRED') {
                        pembayaran = await pembayaranFactory.with({
                            tipePembayaran: 'SPP',
                            metodePembayaran: faker.helpers.arrayElement(['TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE']),
                            jumlahTagihan: totalTagihan,
                            statusPembayaran,
                            tanggalPembayaran: faker.date.recent(30).toISOString().split('T')[0]
                        }).createOne();

                        pembayarans.push(pembayaran);
                    }

                    // Create SPP period
                    const monthIndex = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].indexOf(month) + 1;

                    const tanggalTagihan = `${year}-${monthIndex.toString().padStart(2, '0')}-01`;
                    const tanggalJatuhTempo = `${year}-${monthIndex.toString().padStart(2, '0')}-10`;

                    const periodeSppRecord = await periodeSppFactory.with({
                        programSiswaId: programSiswa.id,
                        bulan: month,
                        tahun: year,
                        tanggalTagihan,
                        tanggalJatuhTempo,
                        jumlahTagihan,
                        voucherId: voucher ? voucher.id : null,
                        diskon,
                        totalTagihan,
                        statusPembayaran,
                        pembayaranId: pembayaran ? pembayaran.id : null
                    }).createOne();

                    periodeSpp.push(periodeSppRecord);
                }
            }

            logger.info(`Created ${periodeSpp.length} periode SPP records and ${pembayarans.length} related pembayaran records`);

            return periodeSpp;
        } catch (error) {
            logger.error('Error seeding periode SPP:', error);
            throw error;
        }
    }
}

module.exports = PeriodeSppSeeder;