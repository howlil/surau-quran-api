
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NAMA_KELAS } = require('../../lib/constants/enum');

class KelasSeeder {
    static async seed() {
        try {
            const kelasList = [
                { namaKelas: NAMA_KELAS.MADINAH },
                { namaKelas: NAMA_KELAS.MAKKAH },
                { namaKelas: NAMA_KELAS.ALAQSA },
                { namaKelas: NAMA_KELAS.PUSTAKA },
                { namaKelas: NAMA_KELAS.NABAWI },
                { namaKelas: NAMA_KELAS.SHAFA },
                { namaKelas: NAMA_KELAS.MARWAH },
                { namaKelas: NAMA_KELAS.PRIVATE },

            ];

            const existingKelas = await prisma.kelas.findFirst();

            if (existingKelas) {
                logger.info('Kelas data already exists, skipping seeder');
                return;
            }

            const results = await prisma.$transaction(
                kelasList.map(kelas =>
                    prisma.kelas.create({
                        data: kelas
                    })
                )
            );

            logger.info(`${results.length} kelas records created successfully`);
            return results;
        } catch (error) {
            logger.error('Failed to seed kelas data:', error);
            throw error;
        }
    }
}

module.exports = KelasSeeder;