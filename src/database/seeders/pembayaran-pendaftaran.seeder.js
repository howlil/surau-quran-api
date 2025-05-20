const { logger } = require('../../lib/config/logger.config');
const pembayaranFactory = require('../factories/pembayaran.factory');
const pendaftaranFactory = require('../factories/pendaftaran.factory');
const { faker } = require('@faker-js/faker');



class PembayaranAndPendaftaranSeeder {
    static async seed({ programSiswas, vouchers }) {
        try {
            logger.info('Seeding pembayaran and pendaftaran...');

            const pembayarans = [];
            const pendaftarans = [];

            // Create payments and registrations for all program siswa
            for (const programSiswa of programSiswas) {
                // Create payment record
                const biayaPendaftaran = parseFloat(faker.finance.amount(100000, 300000, 0));

                // Determine if a voucher will be used (30% chance)
                const useVoucher = faker.datatype.boolean(0.3);
                let voucher = null;
                let diskon = 0;

                if (useVoucher && vouchers.length > 0) {
                    voucher = faker.helpers.arrayElement(vouchers);

                    if (voucher.tipe === 'PERSENTASE') {
                        diskon = (biayaPendaftaran * voucher.nominal) / 100;
                    } else {
                        diskon = parseFloat(voucher.nominal);
                    }
                }

                const totalBiaya = biayaPendaftaran - diskon;

                // Create payment
                const pembayaran = await pembayaranFactory.with({
                    tipePembayaran: 'PENDAFTARAN',
                    metodePembayaran: faker.helpers.arrayElement(['TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE']),
                    jumlahTagihan: totalBiaya,
                    statusPembayaran: faker.helpers.arrayElement(['PENDING', 'PAID', 'SETTLED', 'EXPIRED']),
                    tanggalPembayaran: faker.date.recent(30).toISOString().split('T')[0]
                }).createOne();

                pembayarans.push(pembayaran);

                // Create pendaftaran
                const pendaftaran = await pendaftaranFactory.with({
                    siswaId: programSiswa.siswaId,
                    programSiswaId: programSiswa.id,
                    pembayaranId: pembayaran.id,
                    biayaPendaftaran,
                    tanggalDaftar: faker.date.recent(60).toISOString().split('T')[0],
                    voucherId: voucher ? voucher.id : null,
                    diskon,
                    totalBiaya,
                    statusVerifikasi: faker.helpers.arrayElement(['MENUNGGU', 'DIVERIFIKASI'])
                }).createOne();

                pendaftarans.push(pendaftaran);
            }

            logger.info(`Created ${pembayarans.length} pembayaran records and ${pendaftarans.length} pendaftaran records`);

            return { pembayarans, pendaftarans };
        } catch (error) {
            logger.error('Error seeding pembayaran and pendaftaran:', error);
            throw error;
        }
    }
}

module.exports = PembayaranAndPendaftaranSeeder;