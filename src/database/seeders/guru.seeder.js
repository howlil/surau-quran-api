const { logger } = require('../../lib/config/logger.config');
const guruFactory = require('../factories/guru.factory');
const { faker } = require('@faker-js/faker');

class GuruSeeder {
  static async seed(guruUsers) {
    try {
      logger.info('Seeding gurus...');
      
      if (!guruUsers || !guruUsers.length) {
        logger.error('No guru users provided for GuruSeeder');
        throw new Error('No guru users provided for GuruSeeder');
      }
      
      logger.info(`Received ${guruUsers.length} guru users to create profiles for`);
      
      // Create guru profiles for each guru user
      const gurus = [];
      
      for (const user of guruUsers) {
        try {
          const guru = await guruFactory.with({ 
            userId: user.id,
            // Make sure each guru has a unique NIP
            nip: faker.string.numeric(6)
          }).createOne();
          
          gurus.push(guru);
        } catch (error) {
          logger.error(`Failed to create guru profile for user ${user.id}: ${error.message}`);
          // Continue with the next one
        }
      }
      
      logger.info(`Created ${gurus.length} guru profiles`);
      
      if (gurus.length === 0) {
        logger.warn('No guru profiles were created!');
      }
      
      return gurus;
    } catch (error) {
      logger.error('Error seeding gurus:', error);
      throw error;
    }
  }
}

module.exports = GuruSeeder;