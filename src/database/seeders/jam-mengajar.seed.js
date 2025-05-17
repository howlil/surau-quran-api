
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');

class JamMengajarSeeder {
  static async seed() {
    try {
      // Creating standard teaching time slots
      const jamMengajarList = [
        { jamMulai: '10:00', jamSelesai: '11:45' },
        { jamMulai: '13:00', jamSelesai: '14:45' },
        { jamMulai: '15:00', jamSelesai: '16:45' },
        { jamMulai: '16:45', jamSelesai: '18:00' },
        { jamMulai: '19:00', jamSelesai: '20:40' }
      ];

      const existingJamMengajar = await prisma.jamMengajar.findFirst();
      
      if (existingJamMengajar) {
        logger.info('JamMengajar data already exists, skipping seeder');
        return;
      }

      const results = await prisma.$transaction(
        jamMengajarList.map(jam => 
          prisma.jamMengajar.create({
            data: {
              jamMulai: jam.jamMulai,
              jamSelesai: jam.jamSelesai
            }
          })
        )
      );

      logger.info(`${results.length} jam mengajar records created successfully`);
      return results;
    } catch (error) {
      logger.error('Failed to seed jam mengajar data:', error);
      throw error;
    }
  }
}

module.exports = JamMengajarSeeder;