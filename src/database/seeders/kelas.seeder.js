const { logger } = require('../../lib/config/logger.config');
const kelasFactory = require('../factories/kelas.factory');

class KelasSeeder {
  static async seed() {
    try {
      logger.info('Seeding kelas...');
      
      // Define predefined class names from your enum
      const predefinedKelasNames = [
        'Makkah', 'Madinah', 'Alaqsa', 'Pustaka', 'Nabawi', 'Shafa', 'Marwah', 'Private'
      ];
      
      // Create one record for each predefined class name
      const kelases = [];
      
      for (const namaKelas of predefinedKelasNames) {
        try {
          const kelas = await kelasFactory.with({ namaKelas }).createOne();
          kelases.push(kelas);
        } catch (error) {
          logger.error(`Failed to create kelas '${namaKelas}': ${error.message}`);
          // Continue with the next one
        }
      }
      
      logger.info(`Created ${kelases.length} kelas records`);
      
      if (kelases.length === 0) {
        logger.warn('No kelas records were created!');
      }
      
      return kelases;
    } catch (error) {
      logger.error('Error seeding kelas:', error);
      throw error;
    }
  }
}

module.exports = KelasSeeder;