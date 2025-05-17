
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { PROGRAM } = require('../../lib/constants/enum');

class ProgramSeeder {
  static async seed() {
    try {
      const programList = [
        { namaProgram: PROGRAM.PRE_BTA },
        { namaProgram: PROGRAM.BTA_LVL_1 },
        { namaProgram: PROGRAM.BTA_LVL_2 },
        { namaProgram: PROGRAM.TAHSIN },
        { namaProgram: PROGRAM.TAHFIDZ },
        { namaProgram: PROGRAM.PRIVATE }
      ];

      const existingProgram = await prisma.program.findFirst();
      
      if (existingProgram) {
        logger.info('Program data already exists, skipping seeder');
        return;
      }

      const results = await prisma.$transaction(
        programList.map(program => 
          prisma.program.create({
            data: program
          })
        )
      );

      logger.info(`${results.length} program records created successfully`);
      return results;
    } catch (error) {
      logger.error('Failed to seed program data:', error);
      throw error;
    }
  }
}

module.exports = ProgramSeeder;