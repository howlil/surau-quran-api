const { logger } = require('../../lib/config/logger.config');
const jadwalSiswaFactory = require('../factories/jadwal-siswa.factory');
const { faker } = require('@faker-js/faker');

class JadwalSiswaSeeder {
  static async seed({ programSiswas, kelasPrograms }) {
    try {
      logger.info('Seeding jadwal siswa...');

      const jadwalSiswas = [];

      // Only create jadwal for active program-siswa entries
      const activePrograms = programSiswas.filter(ps => ps.status === 'AKTIF');

      // Assign each active program-siswa to a matching kelasProgram
      for (const programSiswa of activePrograms) {
        // Find matching kelasPrograms (same program)
        const matchingKelasPrograms = kelasPrograms.filter(
          kp => kp.programId === programSiswa.programId
        );

        if (matchingKelasPrograms.length > 0) {
          // Randomly select a kelas program for this student
          const selectedKelasProgram = faker.helpers.arrayElement(matchingKelasPrograms);

          const jadwalSiswa = await jadwalSiswaFactory.with({
            programSiswaId: programSiswa.id,
            kelasProgramId: selectedKelasProgram.id
          }).createOne();

          jadwalSiswas.push(jadwalSiswa);
        }
      }

      logger.info(`Created ${jadwalSiswas.length} jadwal siswa records`);

      return jadwalSiswas;
    } catch (error) {
      logger.error('Error seeding jadwal siswa:', error);
      throw error;
    }
  }
}

module.exports = JadwalSiswaSeeder;