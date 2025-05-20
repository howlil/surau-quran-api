const { logger } = require('../../lib/config/logger.config');
const siswaFactory = require('../factories/siswa.factory');

class SiswaSeeder {
  static async seed(siswaUsers) {
    try {
      logger.info('Seeding siswas...');
      
      // Create siswa profiles for each siswa user
      const siswas = await Promise.all(
        siswaUsers.map(user => 
          siswaFactory.with({ 
            userId: user.id,
            isRegistered: true
          }).createOne()
        )
      );
      
      logger.info(`Created ${siswas.length} siswa profiles`);
      
      return siswas;
    } catch (error) {
      logger.error('Error seeding siswas:', error);
      throw error;
    }
  }
}

module.exports = SiswaSeeder;