const { logger } = require('../../lib/config/logger.config');
const pendaftaranJadwalFactory = require('../factories/pendaftaran-jadwal.factory');
const { faker } = require('@faker-js/faker');

class PendaftaranJadwalSeeder {
  static async seed({ pendaftarans, jamMengajars }) {
    try {
      logger.info('Seeding pendaftaran jadwal...');
      
      const pendaftaranJadwals = [];
      
      // For each pendaftaran, create 1-3 schedule preferences
      for (const pendaftaran of pendaftarans) {
        const numPreferences = faker.number.int({ min: 1, max: 3 });
        
        // Select random jam mengajar for this student's preferences
        const selectedJamMengajars = faker.helpers.arrayElements(jamMengajars, numPreferences);
        
        // Create schedule preferences with different priorities
        for (let i = 0; i < selectedJamMengajars.length; i++) {
          const jamMengajar = selectedJamMengajars[i];
          
          const pendaftaranJadwal = await pendaftaranJadwalFactory.with({
            pendaftaranId: pendaftaran.id,
            jamMengajarId: jamMengajar.id,
            hari: faker.helpers.arrayElement(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']),
            prioritas: i + 1 // Priority 1, 2, 3...
          }).createOne();
          
          pendaftaranJadwals.push(pendaftaranJadwal);
        }
      }
      
      logger.info(`Created ${pendaftaranJadwals.length} pendaftaran jadwal records`);
      
      return pendaftaranJadwals;
    } catch (error) {
      logger.error('Error seeding pendaftaran jadwal:', error);
      throw error;
    }
  }
}

module.exports = PendaftaranJadwalSeeder;