const { logger } = require('../../lib/config/logger.config');
const jamMengajarFactory = require('../factories/jam-mengajar.factory');

class JamMengajarSeeder {
  static async seed() {
    try {
      logger.info('Seeding jam mengajar...');
      
      // Define predefined teaching hours
      const predefinedJamMengajar = [
        { jamMulai: '10:00', jamSelesai: '11:45' },
        { jamMulai: '13:00', jamSelesai: '14:45' },
        { jamMulai: '15:00', jamSelesai: '16:45' },
        { jamMulai: '16:45', jamSelesai: '18:30' },
        { jamMulai: '19:00', jamSelesai: '20:45' }
      ];
      
      // Create one record for each predefined teaching hour
      const jamMengajars = [];
      
      for (const jam of predefinedJamMengajar) {
        try {
          const jamMengajar = await jamMengajarFactory.with(jam).createOne();
          jamMengajars.push(jamMengajar);
        } catch (error) {
          logger.error(`Failed to create jam mengajar '${jam.jamMulai}-${jam.jamSelesai}': ${error.message}`);
          // Continue with the next one
        }
      }
      
      logger.info(`Created ${jamMengajars.length} jam mengajar records`);
      
      if (jamMengajars.length === 0) {
        logger.warn('No jam mengajar records were created!');
      }
      
      return jamMengajars;
    } catch (error) {
      logger.error('Error seeding jam mengajar:', error);
      throw error;
    }
  }
}

module.exports = JamMengajarSeeder;