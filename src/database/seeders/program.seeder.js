const { logger } = require('../../lib/config/logger.config');
const programFactory = require('../factories/program.factory');

class ProgramSeeder {
  static async seed() {
    try {
      logger.info('Seeding programs...');
      
      // Define predefined program names from your enum
      const predefinedProgramNames = [
        'Pre BTA', 'BTA LVL 1', 'BTA LVL 2', 'Tahsin', 'Tahfidz', 'Private'
      ];
      
      // Create one record for each predefined program name
      const programs = [];
      
      for (const namaProgram of predefinedProgramNames) {
        try {
          const program = await programFactory.with({ namaProgram }).createOne();
          programs.push(program);
        } catch (error) {
          logger.error(`Failed to create program '${namaProgram}': ${error.message}`);
          // Continue with the next one
        }
      }
      
      logger.info(`Created ${programs.length} program records`);
      
      if (programs.length === 0) {
        logger.warn('No program records were created!');
      }
      
      return programs;
    } catch (error) {
      logger.error('Error seeding programs:', error);
      throw error;
    }
  }
}

module.exports = ProgramSeeder;