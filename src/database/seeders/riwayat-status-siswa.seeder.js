const { logger } = require('../../lib/config/logger.config');
const riwayatStatusSiswaFactory = require('../factories/riwayat-status-siswa.factory');
const { faker } = require('@faker-js/faker');

class RiwayatStatusSiswaSeeder {
  static async seed({ programSiswas }) {
    try {
      logger.info('Seeding riwayat status siswa...');
      
      const riwayatStatusSiswas = [];
      
      // Create riwayat status for 30% of program-siswa entries
      const selectedPrograms = faker.helpers.arrayElements(
        programSiswas,
        Math.floor(programSiswas.length * 0.3)
      );
      
      for (const programSiswa of selectedPrograms) {
        // Current status of the program
        const currentStatus = programSiswa.status;
        
        // Generate a random previous status different from current
        let previousStatus;
        do {
          previousStatus = faker.helpers.arrayElement(['AKTIF', 'TIDAK_AKTIF', 'CUTI']);
        } while (previousStatus === currentStatus);
        
        const riwayatStatus = await riwayatStatusSiswaFactory.with({
          programSiswaId: programSiswa.id,
          statusLama: previousStatus,
          statusBaru: currentStatus,
          tanggalPerubahan: faker.date.recent(30).toISOString().split('T')[0]
        }).createOne();
        
        riwayatStatusSiswas.push(riwayatStatus);
      }
      
      logger.info(`Created ${riwayatStatusSiswas.length} riwayat status siswa records`);
      
      return riwayatStatusSiswas;
    } catch (error) {
      logger.error('Error seeding riwayat status siswa:', error);
      throw error;
    }
  }
}

module.exports = RiwayatStatusSiswaSeeder;